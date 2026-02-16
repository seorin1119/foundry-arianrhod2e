/**
 * Enemy Identification System for Arianrhod 2E (Rulebook p.236).
 * - [INT] check vs identifyDC
 * - Success reveals: name, type, level, element, defense comparison, skills
 * - Same enemy cannot be retried
 * - State tracked via combat flags or world-level setting
 */

import { rollCheckDialog } from "../dice.mjs";

/**
 * Roll an enemy identification check.
 * @param {Actor} actor - The identifying character
 * @param {Actor} targetActor - The enemy to identify
 * @returns {Promise<boolean>} true if identification succeeded
 */
export async function rollEnemyIdentify(actor, targetActor) {
  if (!targetActor || targetActor.type !== "enemy") {
    ui.notifications.warn(game.i18n.localize("ARIANRHOD.IdentifyNotEnemy"));
    return false;
  }

  // Check if already identified by this user
  if (isIdentified(targetActor)) {
    ui.notifications.info(game.i18n.localize("ARIANRHOD.IdentifyAlready"));
    return true;
  }

  // Check if this actor already failed (no retry)
  if (hasFailedIdentify(actor, targetActor)) {
    ui.notifications.warn(game.i18n.localize("ARIANRHOD.IdentifyNoRetry"));
    return false;
  }

  const dc = targetActor.system.identifyDC ?? 10;
  const intBonus = actor.system.abilities?.int?.bonus ?? 0;
  const specialCheck = actor.system.specialChecks?.enemyIdentify ?? 0;
  const modifier = intBonus + specialCheck;

  // Roll INT check with difficulty
  const result = await rollCheckDialog({
    title: `${game.i18n.localize("ARIANRHOD.IdentifyEnemy")} — ${actor.name}`,
    modifier,
    label: game.i18n.localize("ARIANRHOD.IdentifyEnemy"),
    difficulty: dc,
    actor,
  });

  if (!result) return false; // Dialog cancelled

  const success = result.total >= dc;

  if (success) {
    await markIdentified(targetActor, actor);
    await postIdentifyCard(actor, targetActor, result.total, dc, true);
  } else {
    await markFailedIdentify(actor, targetActor);
    await postIdentifyCard(actor, targetActor, result.total, dc, false);
  }

  return success;
}

/**
 * Check if an enemy is identified (by anyone).
 * @param {Actor} targetActor - The enemy actor
 * @returns {boolean}
 */
export function isIdentified(targetActor) {
  // Check combat flags first
  const combat = game.combat;
  if (combat?.started) {
    const identified = combat.getFlag("arianrhod2e", "identified") ?? {};
    if (identified[targetActor.id]?.revealed) return true;
  }
  // Check actor flag for non-combat identification
  return !!targetActor.getFlag("arianrhod2e", "identified");
}

/**
 * Check if an actor has already failed to identify a target (no retry).
 * @param {Actor} actor - The identifying actor
 * @param {Actor} targetActor - The enemy
 * @returns {boolean}
 */
function hasFailedIdentify(actor, targetActor) {
  const combat = game.combat;
  if (combat?.started) {
    const identified = combat.getFlag("arianrhod2e", "identified") ?? {};
    const entry = identified[targetActor.id];
    return entry?.failed?.includes(actor.id) ?? false;
  }
  const failed = targetActor.getFlag("arianrhod2e", "identifyFailed") ?? [];
  return failed.includes(actor.id);
}

/**
 * Mark an enemy as identified.
 * @param {Actor} targetActor - The enemy
 * @param {Actor} actor - The identifying actor
 */
async function markIdentified(targetActor, actor) {
  const combat = game.combat;
  if (combat?.started) {
    const identified = foundry.utils.deepClone(combat.getFlag("arianrhod2e", "identified") ?? {});
    identified[targetActor.id] = {
      revealed: true,
      by: [...(identified[targetActor.id]?.by ?? []), actor.id],
      failed: identified[targetActor.id]?.failed ?? [],
    };
    await combat.setFlag("arianrhod2e", "identified", identified);
  }
  await targetActor.setFlag("arianrhod2e", "identified", true);
}

/**
 * Mark a failed identification attempt (for retry prevention).
 * @param {Actor} actor - The identifying actor
 * @param {Actor} targetActor - The enemy
 */
async function markFailedIdentify(actor, targetActor) {
  const combat = game.combat;
  if (combat?.started) {
    const identified = foundry.utils.deepClone(combat.getFlag("arianrhod2e", "identified") ?? {});
    if (!identified[targetActor.id]) {
      identified[targetActor.id] = { revealed: false, by: [], failed: [] };
    }
    if (!identified[targetActor.id].failed.includes(actor.id)) {
      identified[targetActor.id].failed.push(actor.id);
    }
    await combat.setFlag("arianrhod2e", "identified", identified);
  } else {
    const failed = [...(targetActor.getFlag("arianrhod2e", "identifyFailed") ?? [])];
    if (!failed.includes(actor.id)) {
      failed.push(actor.id);
      await targetActor.setFlag("arianrhod2e", "identifyFailed", failed);
    }
  }
}

/**
 * Get revealed info for an identified enemy.
 * @param {Actor} targetActor - The enemy actor
 * @returns {object} Revealed info
 */
export function getRevealedInfo(targetActor) {
  if (!isIdentified(targetActor)) return null;
  const sys = targetActor.system;
  const physDef = sys.combat?.physDef ?? 0;
  const magDef = sys.combat?.magDef ?? 0;
  let defenseComparison;
  if (physDef > magDef) defenseComparison = game.i18n.localize("ARIANRHOD.IdentifyPhysDefHigher");
  else if (magDef > physDef) defenseComparison = game.i18n.localize("ARIANRHOD.IdentifyMagDefHigher");
  else defenseComparison = game.i18n.localize("ARIANRHOD.IdentifyDefEqual");

  const skills = targetActor.items
    ?.filter(i => i.type === "skill")
    ?.map(i => i.name) ?? [];

  return {
    name: targetActor.name,
    type: sys.enemyType ? game.i18n.localize(CONFIG.ARIANRHOD.enemyTypes[sys.enemyType] ?? sys.enemyType) : "",
    level: sys.level,
    element: sys.element !== "none" ? game.i18n.localize(CONFIG.ARIANRHOD.elements[sys.element] ?? sys.element) : "",
    defenseComparison,
    skills,
  };
}

/**
 * Post an identification result chat card.
 */
async function postIdentifyCard(actor, targetActor, total, dc, success) {
  let content = `<div class="ar-combat-card ar-identify-card">
    <header class="ar-card-header">
      <img class="ar-card-icon" src="${targetActor.img || 'icons/svg/mystery-man.svg'}" width="32" height="32" />
      <div class="ar-card-title">
        <h3>${game.i18n.localize("ARIANRHOD.IdentifyEnemy")}</h3>
        <span class="ar-card-subtitle">${actor.name}</span>
      </div>
    </header>
    <div class="ar-card-row">
      <span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Check")}</span>
      <span class="ar-card-value">${total} vs ${game.i18n.localize("ARIANRHOD.IdentifyDC")} ${dc}</span>
    </div>`;

  if (success) {
    const info = getRevealedInfo(targetActor);
    content += `<div class="ar-card-badge ar-badge-success">
      <i class="fas fa-check"></i> ${game.i18n.localize("ARIANRHOD.IdentifySuccess")}
    </div>
    <div class="ar-identify-info">
      <div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Name")}</span><span class="ar-card-value">${info.name}</span></div>
      ${info.type ? `<div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.EnemyType")}</span><span class="ar-card-value">${info.type}</span></div>` : ""}
      <div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Level")}</span><span class="ar-card-value">${info.level}</span></div>
      ${info.element ? `<div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Element")}</span><span class="ar-card-value">${info.element}</span></div>` : ""}
      <div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Defense")}</span><span class="ar-card-value">${info.defenseComparison}</span></div>
      ${info.skills.length > 0 ? `<div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Skills")}</span><span class="ar-card-value">${info.skills.join(", ")}</span></div>` : ""}
    </div>`;
  } else {
    content += `<div class="ar-card-badge ar-badge-fail">
      <i class="fas fa-xmark"></i> ${game.i18n.localize("ARIANRHOD.IdentifyFail")}
    </div>`;
  }

  content += `</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });
}

/**
 * Reset identification flags when combat ends.
 * Called from deleteCombat hook.
 */
export function resetCombatIdentification() {
  // Actor-level flags remain (persist across combats for scenario use)
  // Combat flags are automatically cleaned up when combat is deleted
}
