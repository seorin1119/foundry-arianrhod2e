/**
 * Combat Manager for Arianrhod 2E.
 * Manages combat phases, turn processing, and cleanup.
 *
 * Combat flow per round:
 *   Setup Phase → Initiative Phase → Main Phase (per combatant turn) → Cleanup Phase
 *
 * Cleanup phase:
 *   1. Process poison damage (독(n) → 5n HP loss)
 *   2. Remove all 7 bad statuses (rage, stun, offguard, intimidation, poison, knockback, slip)
 *   3. Recover incapacitated characters (HP=0 → HP=1)
 */
import {
  createActionState,
  setActionState,
  getActionState,
  ACTION_TYPES,
  canPerformAction,
  consumeAction,
} from "./action-economy.mjs";

// Combat phases
export const PHASES = {
  SETUP: "setup",
  INITIATIVE: "initiative",
  MAIN: "main",
  CLEANUP: "cleanup",
};

/**
 * Initialize combat state when combat starts.
 * Sets initial phase and resets action states for all combatants.
 * @param {Combat} combat - The combat encounter
 */
export async function initializeCombat(combat) {
  await combat.setFlag("arianrhod2e", "phase", PHASES.SETUP);
  await combat.setFlag("arianrhod2e", "engagements", []);
  // Initialize action states for all combatants
  for (const combatant of combat.combatants) {
    await setActionState(combatant, createActionState());
  }
}

/**
 * Process the start of a combatant's turn.
 * Resets action economy, transitions to main phase, and notifies about status penalties.
 * @param {Combat} combat - The combat encounter
 * @param {Combatant} combatant - The combatant whose turn is starting
 */
export async function onTurnStart(combat, combatant) {
  if (!combatant?.actor) return;
  const enabled = game.settings.get("arianrhod2e", "actionEconomyEnabled") ?? true;
  if (!enabled) return;

  // Reset action state for new turn
  await setActionState(combatant, createActionState());

  // Set phase to main
  await combat.setFlag("arianrhod2e", "phase", PHASES.MAIN);

  // Notify current turn with status info
  const actor = combatant.actor;
  const name = actor.name;

  // Check knockback penalty: ノックバック(n) → Initiative -5n for the turn
  if (actor.hasStatusEffect?.("knockback")) {
    const knockbackN = actor.getFlag?.("arianrhod2e", "knockbackValue") ?? 1;
    const penalty = knockbackN * 5;
    ui.notifications.info(game.i18n.format("ARIANRHOD.KnockbackPenalty", { name, penalty }));
  }

  // Check off-guard: オフガード → -2 to evasion (handled by ActiveEffect, just notify)
  if (actor.hasStatusEffect?.("offguard")) {
    ui.notifications.info(game.i18n.format("ARIANRHOD.OffGuardWarning", { name }));
  }
}

/**
 * Process the end of a combatant's turn.
 * Currently minimal -- cleanup happens at end of round.
 * @param {Combat} combat - The combat encounter
 * @param {Combatant} combatant - The combatant whose turn is ending
 */
export async function onTurnEnd(combat, combatant) {
  // Nothing special at turn end in Arianrhod 2E.
  // Cleanup happens at end of round via processCleanup().
}

/**
 * Process cleanup phase at end of round.
 * Called after all combatants have acted, before the next round begins.
 *
 * Steps:
 *   1. Process poison damage: 독(n) → 5n HP loss
 *   2. Remove all 7 bad statuses
 *   3. Recover incapacitated: HP=0 → HP=1
 *
 * @param {Combat} combat - The combat encounter
 */
export async function processCleanup(combat) {
  const messages = [];

  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    // 1. Process poison damage: 독(n) → 5n HP loss
    const poisonEffect = actor.effects.find(e => e.statuses.has("poison"));
    if (poisonEffect) {
      const poisonN = actor.getFlag?.("arianrhod2e", "poisonValue") ?? 1;
      const poisonDmg = poisonN * 5;
      const currentHP = actor.system.combat.hp.value;
      const newHP = Math.max(0, currentHP - poisonDmg);
      await actor.update({ "system.combat.hp.value": newHP });
      messages.push(
        `<div class="arianrhod status-msg"><img src="icons/svg/poison.svg" width="16" height="16"/> ${actor.name}: ${game.i18n.localize("ARIANRHOD.PoisonDamage")} (-${poisonDmg} HP)</div>`
      );
    }

    // 2. Remove all 7 bad statuses (7대 배드 스테이터스) at cleanup
    const badStatuses = ["rage", "stun", "offguard", "intimidation", "poison", "knockback", "slip"];
    for (const statusId of badStatuses) {
      const effect = actor.effects.find(e => e.statuses.has(statusId));
      if (effect) {
        const statusLabel = game.i18n.localize(`ARIANRHOD.Status${statusId.charAt(0).toUpperCase() + statusId.slice(1)}`);
        await effect.delete();
        messages.push(
          `<div class="arianrhod status-msg"><i class="fas fa-check-circle"></i> ${actor.name}: ${statusLabel} ${game.i18n.localize("ARIANRHOD.StatusRecovered")}</div>`
        );
      }
    }

    // 3. Recover incapacitated: HP=0 → HP=1
    const hp = actor.system?.combat?.hp;
    if (hp && hp.value === 0) {
      await actor.update({ "system.combat.hp.value": 1 });
      messages.push(
        `<div class="arianrhod status-msg"><i class="fas fa-heart-pulse"></i> ${actor.name}: ${game.i18n.localize("ARIANRHOD.IncapacitatedRecovery")}</div>`
      );
    }
  }

  // Post all cleanup messages as a single combined chat card
  if (messages.length > 0) {
    const cleanupHeader = `<h3><i class="fas fa-broom"></i> ${game.i18n.localize("ARIANRHOD.CleanupPhase")}</h3>`;
    const combinedContent = cleanupHeader + messages.join("");
    await ChatMessage.create({
      content: `<div class="arianrhod ar-cleanup-card">${combinedContent}</div>`,
    });
  }

  // Set phase to cleanup
  await combat.setFlag("arianrhod2e", "phase", PHASES.CLEANUP);
}

/**
 * Validate and perform a combat action for a combatant.
 * Checks action economy, consumes the action if allowed.
 * @param {Combatant} combatant - The combatant performing the action
 * @param {string} actionType - One of ACTION_TYPES values
 * @param {string|null} [moveType=null] - For move actions, one of MOVE_TYPES values
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function performAction(combatant, actionType, moveType = null) {
  const enabled = game.settings.get("arianrhod2e", "actionEconomyEnabled") ?? true;
  if (!enabled) return { allowed: true };

  const state = getActionState(combatant);
  const check = canPerformAction(state, actionType, combatant.actor);

  if (!check.allowed) {
    ui.notifications.warn(game.i18n.localize(check.reason));
    return check;
  }

  const newState = consumeAction(state, actionType, moveType);
  await setActionState(combatant, newState);
  return { allowed: true };
}

/**
 * Get the current combatant from the active combat.
 * @returns {Combatant|null}
 */
export function getCurrentCombatant() {
  const combat = game.combat;
  if (!combat?.started) return null;
  return combat.combatant;
}

/**
 * Check if an actor is the current combatant (i.e., it is their turn).
 * @param {Actor} actor - The actor to check
 * @returns {boolean}
 */
export function isCurrentCombatant(actor) {
  const combatant = getCurrentCombatant();
  return combatant?.actor?.id === actor?.id;
}

/**
 * Advance the combat phase.
 * @param {Combat} combat - The combat encounter
 * @param {string} phase - Target phase from PHASES
 */
export async function setPhase(combat, phase) {
  await combat.setFlag("arianrhod2e", "phase", phase);
}
