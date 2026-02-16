/**
 * Movement System for Arianrhod 2E.
 * Handles combat movement, full movement, and disengagement.
 *
 * Movement types in Arianrhod 2E:
 * - Combat Move (전투이동): Move up to movement value in meters. Can still use minor action.
 * - Full Move (전력이동): Move up to movement x 2 meters. Cannot use minor action this turn.
 * - Disengage (이탈): Move 5m to escape engagement. Cannot use minor action. Requires opposed check.
 */
import { ACTION_TYPES, MOVE_TYPES, getActionState, canPerformAction, consumeAction, setActionState } from "./action-economy.mjs";
import { isEngaged, removeFromEngagement, getOpponents, createEngagement } from "./engagement.mjs";

/**
 * Get available movement options for a combatant.
 * Returns an array of movement choices with availability based on current action state.
 * @param {Combatant} combatant
 * @returns {object[]} Array of {type, label, distance, available, reason}
 */
export function getMovementOptions(combatant) {
  const actor = combatant?.actor;
  if (!actor) return [];

  // Check if mounted — use mount's movement value (rulebook p.242)
  const mountId = actor.getFlag?.("arianrhod2e", "mountId");
  const mountActor = mountId ? game.actors.get(mountId) : null;
  const baseMovement = mountActor ? (mountActor.system.combat?.movement ?? 0) : (actor.system.combat?.movement ?? 0);
  const movement = baseMovement;

  const state = getActionState(combatant);
  const combat = game.combat;
  const engaged = combat ? isEngaged(combat, combatant.id) : false;

  // Flying characters can move freely even while engaged with ground enemies (rulebook p.238)
  const isFlying = actor.hasStatusEffect?.("flight") ?? false;
  const effectivelyEngaged = engaged && !isFlying;

  const options = [];

  // Combat Move (전투이동)
  const combatMoveCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
  options.push({
    type: MOVE_TYPES.COMBAT,
    label: game.i18n.localize("ARIANRHOD.MoveCombat"),
    distance: `${movement}m`,
    available: combatMoveCheck.allowed,
    reason: combatMoveCheck.reason,
  });

  // Full Move (전력이동)
  const fullMoveCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
  options.push({
    type: MOVE_TYPES.FULL,
    label: game.i18n.localize("ARIANRHOD.MoveFull"),
    distance: `${movement * 2}m`,
    available: fullMoveCheck.allowed && !state.minor, // Can't full move if already used minor
    reason: state.minor ? "ARIANRHOD.MoveFullBlockedByMinor" : fullMoveCheck.reason,
  });

  // Disengage (이탈) - only shown if currently engaged (not if flying)
  if (effectivelyEngaged) {
    const disengageCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
    options.push({
      type: MOVE_TYPES.DISENGAGE,
      label: game.i18n.localize("ARIANRHOD.MoveDisengage"),
      distance: `${Math.min(5, movement)}m`,
      available: disengageCheck.allowed && !state.minor,
      reason: state.minor ? "ARIANRHOD.MoveDisengageBlockedByMinor" : disengageCheck.reason,
    });
  }

  // Rush (돌입) - only shown if NOT in engagement (rulebook p.221)
  if (!engaged) {
    const rushCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
    options.push({
      type: MOVE_TYPES.RUSH,
      label: game.i18n.localize("ARIANRHOD.MoveRush"),
      distance: `${movement}m`,
      available: rushCheck.allowed,
      reason: rushCheck.reason,
    });
  }

  return options;
}

/**
 * Execute a movement for a combatant.
 * Validates the action, consumes it, handles disengage removal, and posts a chat message.
 * @param {Combatant} combatant
 * @param {string} moveType - One of MOVE_TYPES constants
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function executeMovement(combatant, moveType) {
  const actor = combatant?.actor;
  if (!actor) return { success: false, reason: "No actor" };

  // If action economy tracking is disabled, allow freely
  const enabled = game.settings?.get("arianrhod2e", "actionEconomyEnabled") ?? true;
  if (!enabled) return { success: true };

  const state = getActionState(combatant);

  // Validate move action is available
  const check = canPerformAction(state, ACTION_TYPES.MOVE, actor);
  if (!check.allowed) {
    ui.notifications.warn(game.i18n.localize(check.reason));
    return { success: false, reason: check.reason };
  }

  // Additional checks for full move / disengage (cannot be used if minor action already taken)
  if ((moveType === MOVE_TYPES.FULL || moveType === MOVE_TYPES.DISENGAGE) && state.minor) {
    const reason = "ARIANRHOD.MoveFullBlockedByMinor";
    ui.notifications.warn(game.i18n.localize(reason));
    return { success: false, reason };
  }

  // For disengage, check blockade then remove from engagement (rulebook p.221)
  if (moveType === MOVE_TYPES.DISENGAGE) {
    const combat = game.combat;
    if (combat) {
      // Check for blockade by opponents in the same engagement
      const opponents = getOpponents(combat, combatant.id);
      if (opponents.length > 0) {
        const escaped = await _resolveBlockade(combatant, opponents);
        if (!escaped) {
          // Blockade succeeded — move action consumed but escape fails
          const blockedState = consumeAction(state, ACTION_TYPES.MOVE, moveType);
          await setActionState(combatant, blockedState);
          return { success: false, reason: "ARIANRHOD.BlockadePreventedEscape" };
        }
      }
      await removeFromEngagement(combat, combatant.id);
    }
  }

  // Rush: enter engagement with a target (rulebook p.221)
  if (moveType === MOVE_TYPES.RUSH) {
    const combat = game.combat;
    if (combat) {
      const rushResult = await _resolveRush(combatant, combat);
      if (!rushResult) {
        return { success: false, reason: "ARIANRHOD.RushCancelled" };
      }
    }
  }

  // Flying characters automatically leave engagement on combat/full move (rulebook p.238)
  if (moveType !== MOVE_TYPES.DISENGAGE && moveType !== MOVE_TYPES.RUSH) {
    const isFlying = actor.hasStatusEffect?.("flight") ?? false;
    if (isFlying) {
      const combat = game.combat;
      if (combat && isEngaged(combat, combatant.id)) {
        await removeFromEngagement(combat, combatant.id);
      }
    }
  }

  // Consume the move action
  const newState = consumeAction(state, ACTION_TYPES.MOVE, moveType);
  await setActionState(combatant, newState);

  // Calculate distance for chat message
  const mountId = actor.getFlag?.("arianrhod2e", "mountId");
  const mountActor = mountId ? game.actors.get(mountId) : null;
  const baseMovement = mountActor ? (mountActor.system.combat?.movement ?? 0) : (actor.system.combat?.movement ?? 0);
  const movement = baseMovement;
  const distance = moveType === MOVE_TYPES.FULL ? movement * 2
    : moveType === MOVE_TYPES.DISENGAGE ? Math.min(5, movement)
    : movement;

  // Resolve the localized move label
  const moveLabel = moveType === MOVE_TYPES.FULL ? game.i18n.localize("ARIANRHOD.MoveFull")
    : moveType === MOVE_TYPES.DISENGAGE ? game.i18n.localize("ARIANRHOD.MoveDisengage")
    : moveType === MOVE_TYPES.RUSH ? game.i18n.localize("ARIANRHOD.MoveRush")
    : game.i18n.localize("ARIANRHOD.MoveCombat");

  // Post movement notification to chat
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="arianrhod ar-move-msg"><i class="fas fa-person-running"></i> ${actor.name}: ${moveLabel} (${distance}m)</div>`,
  });

  return { success: true };
}

/**
 * Resolve blockade: opponents in engagement try to prevent disengage (rulebook p.221).
 * Shows dialog for GM to select blockers, then runs opposed initiative checks.
 * @param {Combatant} escaper - The combatant trying to disengage
 * @param {Combatant[]} opponents - Opposing combatants in the same engagement
 * @returns {Promise<boolean>} True if escape succeeds, false if blocked
 */
async function _resolveBlockade(escaper, opponents) {
  const escaperActor = escaper.actor;
  const escaperInit = escaperActor.system.combat?.initiative ?? 0;

  // Build checkbox list of opponents who can blockade
  const optsHtml = opponents.map(c => {
    const init = c.actor.system.combat?.initiative ?? 0;
    return `<label style="display:block;margin:4px 0"><input type="checkbox" name="blocker" value="${c.id}" /> ${c.actor.name} (${game.i18n.localize("ARIANRHOD.Initiative")}: ${init})</label>`;
  }).join("");

  const dialogContent = `<form>
    <p>${game.i18n.format("ARIANRHOD.BlockadePrompt", { name: escaperActor.name })}</p>
    ${optsHtml}
  </form>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("ARIANRHOD.Blockade") },
    content: dialogContent,
    ok: {
      icon: "fas fa-shield",
      label: game.i18n.localize("ARIANRHOD.Confirm"),
      callback: (event, button) => {
        const checked = button.form.querySelectorAll('input[name="blocker"]:checked');
        return Array.from(checked).map(cb => cb.value);
      },
    },
    rejectClose: false,
  });

  if (!result || result.length === 0) return true; // No blockade → escape succeeds

  // Roll opposed initiative for escaper
  const escaperRoll = new Roll(`2d6 + ${escaperInit}`);
  await escaperRoll.evaluate();

  let blocked = false;
  const results = [];

  for (const blockerId of result) {
    const blocker = opponents.find(c => c.id === blockerId);
    if (!blocker) continue;
    const blockerInit = blocker.actor.system.combat?.initiative ?? 0;
    const blockerRoll = new Roll(`2d6 + ${blockerInit}`);
    await blockerRoll.evaluate();

    // Escaper has attacker priority: ties → escaper wins
    const escaperWins = escaperRoll.total >= blockerRoll.total;
    if (!escaperWins) blocked = true;

    results.push({
      name: blocker.actor.name,
      total: blockerRoll.total,
      blocked: !escaperWins,
    });
  }

  // Post result to chat
  const resultRows = results.map(r => {
    const icon = r.blocked ? "fas fa-shield" : "fas fa-person-running";
    const label = r.blocked
      ? game.i18n.localize("ARIANRHOD.BlockadeSuccess")
      : game.i18n.localize("ARIANRHOD.BlockadeFailed");
    return `<div class="arianrhod status-msg"><i class="${icon}"></i> ${r.name}: ${r.total} → ${label}</div>`;
  }).join("");

  const outcomeIcon = blocked ? "fas fa-shield" : "fas fa-person-running";
  const outcomeLabel = blocked
    ? game.i18n.localize("ARIANRHOD.BlockadePreventedEscape")
    : game.i18n.localize("ARIANRHOD.DisengageSuccess");

  await ChatMessage.create({
    content: `<div class="arianrhod ar-cleanup-card">
      <h3><i class="fas fa-shield"></i> ${game.i18n.localize("ARIANRHOD.Blockade")}</h3>
      <div class="arianrhod status-msg"><i class="fas fa-person-running"></i> ${escaperActor.name}: ${escaperRoll.total}</div>
      ${resultRows}
      <div class="ar-card-badge ${blocked ? "ar-badge-miss" : "ar-badge-hit"}">
        <i class="${outcomeIcon}"></i> ${outcomeLabel}
      </div>
    </div>`,
  });

  return !blocked;
}

/**
 * Resolve rush: select a target combatant to engage with (rulebook p.221).
 * @param {Combatant} rusher - The combatant rushing
 * @param {Combat} combat - The active combat
 * @returns {Promise<boolean>} True if rush executed, false if cancelled
 */
async function _resolveRush(rusher, combat) {
  const actor = rusher.actor;
  // Find valid targets: combatants not in the same engagement, opposite side
  const targets = combat.combatants
    .filter(c => c.id !== rusher.id && c.actor && c.actor.type !== actor.type && (c.actor.system?.combat?.hp?.value ?? 1) > 0)
    .map(c => ({ id: c.id, name: c.actor.name }));

  if (targets.length === 0) {
    ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoRushTarget"));
    return false;
  }

  const opts = targets.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  const dialogContent = `<form>
    <div class="form-group">
      <label>${game.i18n.localize("ARIANRHOD.RushTarget")}</label>
      <select name="targetId">${opts}</select>
    </div>
  </form>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("ARIANRHOD.MoveRush") },
    content: dialogContent,
    ok: {
      icon: "fas fa-person-running",
      label: game.i18n.localize("ARIANRHOD.Confirm"),
      callback: (event, button) => button.form.querySelector('[name="targetId"]').value,
    },
    rejectClose: false,
  });

  if (!result) return false;

  // Create engagement between rusher and target
  await createEngagement(combat, rusher.id, result);

  const targetCombatant = combat.combatants.get(result);
  await ChatMessage.create({
    content: `<div class="arianrhod ar-move-msg"><i class="fas fa-person-running"></i> ${actor.name} → ${targetCombatant?.actor?.name}: ${game.i18n.localize("ARIANRHOD.RushEngaged")}</div>`,
    speaker: ChatMessage.getSpeaker({ actor }),
  });

  return true;
}
