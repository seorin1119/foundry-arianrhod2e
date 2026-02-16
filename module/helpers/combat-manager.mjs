/**
 * Combat Manager for Arianrhod 2E.
 * Manages combat phases, turn processing, and cleanup.
 *
 * Combat flow per round:
 *   Setup Phase → Initiative Phase → Main Phase (per combatant turn) → Cleanup Phase
 *
 * Cleanup phase (per rulebook p.228):
 *   1. Process poison damage (독(n) → 5n HP loss)
 *   2. Remove auto-recover statuses: rage (격노), offguard (멍함), knockback (넉백)
 *
 * Initiative phase (next round start):
 *   - Remove stun (스턴)
 *
 * Manual recovery only:
 *   - intimidation (위압): minor action
 *   - poison (독): skill/item only
 *   - slip (슬립): move action
 *
 * Combat end:
 *   - Recover incapacitated (HP=0 → HP=1)
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
  await combat.setFlag("arianrhod2e", "surprise", null); // null, "pcs", or "enemies"
  await combat.setFlag("arianrhod2e", "combatStartTime", Date.now());
  // Initialize action states for all combatants
  for (const combatant of combat.combatants) {
    await setActionState(combatant, createActionState());
  }

  // Post combat quick guide chat message
  await ChatMessage.create({
    content: `<div class="arianrhod ar-combat-guide-card">
      <h3><i class="fas fa-swords"></i> ${game.i18n.localize("ARIANRHOD.CombatStart")}</h3>
      <ol>
        <li>${game.i18n.localize("ARIANRHOD.CombatGuideStep1")}</li>
        <li>${game.i18n.localize("ARIANRHOD.CombatGuideStep2")}</li>
        <li>${game.i18n.localize("ARIANRHOD.CombatGuideStep3")}</li>
      </ol>
      <div class="ar-guide-tip"><i class="fas fa-lightbulb"></i> ${game.i18n.localize("ARIANRHOD.CombatGuideTip")}</div>
    </div>`,
  });
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
      try {
        await actor.update({ "system.combat.hp.value": newHP });
      } catch (err) {
        if (!err.message?.includes("OBJECTS")) throw err;
      }
      messages.push(
        `<div class="arianrhod status-msg"><img src="icons/svg/poison.svg" width="16" height="16"/> ${actor.name}: ${game.i18n.localize("ARIANRHOD.PoisonDamage")} (-${poisonDmg} HP)</div>`
      );
    }

    // 2. Remove bad statuses that auto-recover at cleanup (per rulebook p.228)
    // Cleanup auto-recover: rage (격노), offguard (멍함), knockback (넉백)
    // NOT at cleanup: stun (이니셔티브 시), intimidation (마이너 액션), poison (스킬/아이템만), slip (무브 액션)
    const cleanupStatuses = ["rage", "offguard", "knockback"];
    for (const statusId of cleanupStatuses) {
      const effect = actor.effects.find(e => e.statuses.has(statusId));
      if (effect) {
        const statusLabel = game.i18n.localize(`ARIANRHOD.Status${statusId.charAt(0).toUpperCase() + statusId.slice(1)}`);
        try {
          await effect.delete();
        } catch (err) {
          if (!err.message?.includes("OBJECTS") && !err.message?.includes("does not exist")) throw err;
        }
        messages.push(
          `<div class="arianrhod status-msg"><i class="fas fa-check-circle"></i> ${actor.name}: ${statusLabel} ${game.i18n.localize("ARIANRHOD.StatusRecovered")}</div>`
        );
      }
    }

    // Note: Incapacitation recovery (HP=0 → HP=1) happens at combat END, not every round cleanup.
    // See processCombatEnd() for that logic.
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
 * Process initiative phase: recover stun (스턴) at the start of a new round.
 * Per rulebook p.228: stun recovers at the initiative process.
 * @param {Combat} combat - The combat encounter
 */
export async function processInitiativePhase(combat) {
  const messages = [];

  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    const stunEffect = actor.effects.find(e => e.statuses.has("stun"));
    if (stunEffect) {
      const statusLabel = game.i18n.localize("ARIANRHOD.StatusStun");
      try {
        await stunEffect.delete();
      } catch (err) {
        if (!err.message?.includes("OBJECTS") && !err.message?.includes("does not exist")) throw err;
      }
      messages.push(
        `<div class="arianrhod status-msg"><i class="fas fa-check-circle"></i> ${actor.name}: ${statusLabel} ${game.i18n.localize("ARIANRHOD.StatusRecovered")}</div>`
      );
    }
  }

  if (messages.length > 0) {
    await ChatMessage.create({
      content: `<div class="arianrhod ar-cleanup-card"><h3><i class="fas fa-bolt"></i> ${game.i18n.localize("ARIANRHOD.InitiativePhase")}</h3>${messages.join("")}</div>`,
    });
  }
}

/**
 * Process setup phase: notify players that setup-timing skills can be used.
 * Per rulebook p.214: each round begins with a setup process before initiative.
 * @param {Combat} combat - The combat encounter
 * @param {number} round - The round number
 */
export async function processSetupPhase(combat, round) {
  await combat.setFlag("arianrhod2e", "phase", PHASES.SETUP);

  // Collect actors with setup-timing skills
  const setupSkills = [];
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;
    if (actor.system?.dead) continue;
    const skills = actor.items?.filter(i => i.type === "skill" && i.system?.timing === "setup") ?? [];
    if (skills.length > 0) {
      setupSkills.push({
        name: actor.name,
        skills: skills.map(s => s.name).join(", "),
      });
    }
  }

  const skillList = setupSkills.length > 0
    ? setupSkills.map(s => `<div class="arianrhod status-msg"><i class="fas fa-wand-sparkles"></i> ${s.name}: ${s.skills}</div>`).join("")
    : `<div class="arianrhod status-msg"><i class="fas fa-minus"></i> ${game.i18n.localize("ARIANRHOD.SetupNoSkills")}</div>`;

  await ChatMessage.create({
    content: `<div class="arianrhod ar-cleanup-card"><h3><i class="fas fa-cog"></i> ${game.i18n.format("ARIANRHOD.SetupPhase", { round })}</h3>${skillList}</div>`,
  });
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
 * Check if an actor is surprised in the current combat (rulebook p.240).
 * Returns true if the actor is on the surprised side during round 1.
 * @param {Actor} actor - The actor to check
 * @returns {boolean}
 */
export function isSurprised(actor) {
  const combat = game.combat;
  if (!combat?.started || combat.round > 1) return false;
  const surprise = combat.getFlag("arianrhod2e", "surprise");
  if (!surprise) return false;
  // "pcs" means PCs are surprised, "enemies" means enemies are surprised
  if (surprise === "pcs" && actor.type === "character") return true;
  if (surprise === "enemies" && actor.type === "enemy") return true;
  return false;
}

/**
 * Set surprise state for combat. GM calls this via macro or UI.
 * @param {Combat} combat - The combat encounter
 * @param {string|null} side - "pcs", "enemies", or null to clear
 */
export async function setSurprise(combat, side) {
  await combat.setFlag("arianrhod2e", "surprise", side);
  if (side) {
    const sideLabel = side === "pcs"
      ? game.i18n.localize("ARIANRHOD.SurprisePCs")
      : game.i18n.localize("ARIANRHOD.SurpriseEnemies");
    await ChatMessage.create({
      content: `<div class="arianrhod ar-cleanup-card"><h3><i class="fas fa-eye-slash"></i> ${game.i18n.localize("ARIANRHOD.SurpriseAttack")}</h3><div class="arianrhod status-msg">${sideLabel}</div></div>`,
    });
  }
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

/**
 * Process combat end: recover incapacitated characters (HP=0 → HP=1).
 * Per rulebook p.227: incapacitation recovers only when combat (round progression) ends.
 * @param {Combat} combat - The combat encounter being deleted
 */
export async function processCombatEnd(combat) {
  const messages = [];

  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    if (!actor) continue;

    // Dead actors do not recover (rulebook p.227)
    if (actor.system?.dead) continue;
    // Clear coup de grace flags on combat end
    if (actor.getFlag("arianrhod2e", "coupDeGrace")) {
      await actor.unsetFlag("arianrhod2e", "coupDeGrace");
    }
    const hp = actor.system?.combat?.hp;
    if (hp && hp.value === 0) {
      try {
        await actor.update({ "system.combat.hp.value": 1 }, { arianrhod2e: { incapacitationRecovery: true } });
      } catch (err) {
        if (!err.message?.includes("OBJECTS")) throw err;
      }
      messages.push(
        `<div class="arianrhod status-msg"><i class="fas fa-heart-pulse"></i> ${actor.name}: ${game.i18n.localize("ARIANRHOD.IncapacitatedRecovery")}</div>`
      );
    }

    // Reset scene-scoped skill flags (dropShotUsed)
    if (actor.type === "character") {
      if (actor.getFlag("arianrhod2e", "dropShotUsed")) {
        await actor.unsetFlag("arianrhod2e", "dropShotUsed");
      }
    }
  }

  if (messages.length > 0) {
    await ChatMessage.create({
      content: `<div class="arianrhod ar-cleanup-card"><h3><i class="fas fa-flag-checkered"></i> ${game.i18n.localize("ARIANRHOD.CombatEnd")}</h3>${messages.join("")}</div>`,
    });
  }

  // Drop summary card: collect all drop results from this combat
  await _postDropSummary(combat);
}

/**
 * Post a summary card of all drop items from the combat.
 * @param {Combat} combat - The ending combat
 */
async function _postDropSummary(combat) {
  const combatStart = combat.getFlag("arianrhod2e", "combatStartTime") ?? 0;
  if (!combatStart) return;

  const dropSummary = [];
  for (const msg of game.messages) {
    if (msg.timestamp < combatStart) continue;
    const dropFlag = msg.getFlag("arianrhod2e", "dropResult");
    if (dropFlag?.itemName) {
      dropSummary.push(dropFlag);
    }
  }

  if (dropSummary.length === 0) return;

  let totalValue = 0;
  const rows = dropSummary.map(d => {
    const value = (d.price ?? 0) * (d.qty ?? 1);
    totalValue += value;
    const statusBadge = d.collected
      ? `<span class="ar-card-badge ar-badge-success" style="font-size:0.8em;">${game.i18n.localize("ARIANRHOD.DropCollectedShort")}</span>`
      : `<span class="ar-card-badge ar-badge-death" style="font-size:0.8em;">${game.i18n.localize("ARIANRHOD.DropUncollected")}</span>`;
    const qtyStr = (d.qty ?? 1) > 1 ? ` ×${d.qty}` : "";
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return `<div class="ar-drop-summary-row">
      <span>${esc(d.enemyName)}: ${esc(d.itemName)}${qtyStr}</span>
      <span>${value > 0 ? value + "G" : ""} ${statusBadge}</span>
    </div>`;
  }).join("");

  const content = `<div class="ar-combat-card ar-drop-summary-card">
    <header class="ar-card-header">
      <img class="ar-card-icon" src="icons/svg/chest.svg" width="32" height="32" />
      <div class="ar-card-title">
        <h3>${game.i18n.localize("ARIANRHOD.DropSummary")}</h3>
      </div>
    </header>
    ${rows}
    ${totalValue > 0 ? `<div class="ar-summary-total">${game.i18n.localize("ARIANRHOD.TotalValue")}: ${totalValue}G</div>` : ""}
  </div>`;

  await ChatMessage.create({ content });
}

/**
 * Apply environmental/fall damage as penetration damage (rulebook p.240).
 * Default 2D6 penetration damage, GM can adjust dice count.
 * @param {Actor} actor - The target actor
 * @param {number} [diceCount=2] - Number of d6 to roll
 * @param {string} [source=""] - Description of the damage source (e.g., "Fall", "Fire")
 */
export async function applyEnvironmentalDamage(actor, diceCount = 2, source = "") {
  const formula = `${diceCount}d6`;
  const roll = new Roll(formula);
  await roll.evaluate();

  const sourceLabel = source || game.i18n.localize("ARIANRHOD.EnvironmentalDamage");

  const content = `<div class="ar-combat-card ar-damage-card">
    <header class="ar-card-header">
      <img class="ar-card-icon" src="icons/svg/hazard.svg" width="32" height="32" />
      <div class="ar-card-title">
        <h3>${sourceLabel}</h3>
        <span class="ar-card-subtitle">${actor.name}</span>
      </div>
    </header>
    <div class="ar-card-badge ar-badge-penetration">
      <i class="fas fa-burst"></i> ${game.i18n.localize("ARIANRHOD.Penetration")}
    </div>
    <div class="ar-card-row ar-card-final">
      <span class="ar-card-label">${game.i18n.localize("ARIANRHOD.DamageTotal")}</span>
      <span class="ar-card-value ar-final-damage">${roll.total}</span>
    </div>
    <div class="ar-card-actions">
      <button type="button" class="ar-chat-btn ar-apply-btn"
              data-target-id="${actor.id}"
              data-damage="${roll.total}">
        <i class="fas fa-heart-crack"></i> ${game.i18n.localize("ARIANRHOD.ApplyDamage")} (${roll.total})
      </button>
    </div>
  </div>`;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker(),
    content,
  });

  return { roll, damage: roll.total };
}
