/**
 * Skill activation helpers for Arianrhod RPG 2E.
 * Handles cost parsing, MP/HP deduction, and chat card creation.
 */

import { getTimingAction, ACTION_TYPES, canPerformAction, consumeAction, getActionState, setActionState } from "./action-economy.mjs";
import { applySkillEffect, hasStructuredEffect } from "./effect-processor.mjs";

const SKILL_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/skill-card.hbs";

/**
 * Map of attack skills that auto-chain into weapon attacks after activation.
 * All 18 weapon-attack skills (武器攻撃/白兵攻撃/射撃攻撃を行う) from the skill library.
 *
 * Fields:
 *   bonusDicePerLevel  — extra damage dice per SL (e.g. bash +[SL]D)
 *   bonusFlatPerLevel  — extra flat damage per SL (e.g. catch-rope +[SL×2])
 *   hitBonusDice       — static extra hit dice (e.g. backstab +1D)
 *   hitBonusDicePerLevel — extra hit dice per SL (e.g. rapid-strike +(SL)D, combined with hitBonusDice +1 = +(SL+1)D)
 *   damageType         — override damage type ("penetration" to ignore defense)
 *   skipDamage         — if true, skip damage roll (hit-only skills like armor-break)
 */
const ATTACK_SKILL_MAP = {
  // Single-target: bonus damage
  "bash":            { bonusDicePerLevel: 1 },                          // +[SL]D damage
  "holy-smash":      { bonusDicePerLevel: 1 },                          // +[SL]D damage (impact weapon req.)
  "backstab":        { bonusDicePerLevel: 1, hitBonusDice: 1 },         // +1D hit, +[SL]D damage (hidden req.)
  "catch-rope":      { bonusFlatPerLevel: 2 },                          // +[SL×2] damage (whip req.)
  "aerial-rave":     { bonusFlatPerLevel: 3, hitBonusDice: 1 },         // +1D hit, +[SL×3] damage (flight req.)
  "ki-blast":        { bonusFlatPerLevel: 2 },                          // +[SL×2] damage, 〈無〉属性 magic dmg
  "throw-down":      { bonusFlatPerLevel: 2 },                          // +[SL×2] damage, inflicts slip
  "rapid-strike":    { hitBonusDice: 1, hitBonusDicePerLevel: 1 },      // +[(SL+1)D] hit

  // Single-target: special effects
  "piercing-strike": { damageType: "penetration" },                     // ignores all defense
  "suppression":     {},                                                 // ranged, evasion debuff on hit
  "sonic-boom":      {},                                                 // extended range melee
  "cripple":         {},                                                 // evasion debuff on hit
  "armor-break":     { skipDamage: true },                              // hit only, reduces physDef

  // Multi-target: chain to single attack roll; multi-target handling is Phase 2
  "wide-attack":        {},                                              // multi-target weapon attack
  "sweep":              {},                                              // engagement AoE melee
  "rapid-shot":         {},                                              // multi-target ranged (magigun)
  "rapid-fire-ranger":  {},                                              // engagement AoE ranged
  "flash-strike":       {},                                              // weapon attack, mob instant-kill
};

/**
 * Map of after-damage skills that trigger special effects after the damage roll.
 */
const AFTER_DAMAGE_SKILL_MAP = {
  "treasure-hunt": { triggersDropRoll: true },
};

/**
 * Parse a skill cost string into numeric MP and HP values.
 * @param {string} costString - The cost string (e.g. "3", "SL×2", "SLx3")
 * @param {number} skillLevel - The current skill level
 * @returns {{mp: number, hp: number}}
 */
export function parseSkillCost(costString, skillLevel) {
  if (!costString) return { mp: 0, hp: 0 };

  const s = costString.toString().trim();
  if (!s) return { mp: 0, hp: 0 };

  // Check for SL-based cost: "SL×2", "SLx2", "SL*2"
  const slMatch = s.match(/^SL\s*[×x*]\s*(\d+)$/i);
  if (slMatch) {
    return { mp: skillLevel * Number(slMatch[1]), hp: 0 };
  }

  // Pure number
  const num = Number(s);
  if (!Number.isNaN(num)) {
    return { mp: num, hp: 0 };
  }

  // Unrecognized format — treat as zero cost
  return { mp: 0, hp: 0 };
}

/**
 * Activate a skill: deduct cost and post a chat card.
 * @param {Actor} actor - The owning actor
 * @param {Item} item  - The skill item
 * @returns {Promise<boolean>} true if activation succeeded
 */
export async function activateSkill(actor, item) {
  const skillLevel = item.system.level ?? 1;
  const cost = parseSkillCost(item.system.cost, skillLevel);

  // Check MP
  if (cost.mp > 0) {
    const currentMP = actor.system.combat?.mp?.value ?? 0;
    if (currentMP < cost.mp) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.InsufficientMP"));
      return false;
    }
  }

  // Check HP
  if (cost.hp > 0) {
    const currentHP = actor.system.combat?.hp?.value ?? 0;
    if (currentHP < cost.hp) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.InsufficientHP"));
      return false;
    }
  }

  // Action economy check
  const actionEconomyEnabled = game.settings?.get("arianrhod2e", "actionEconomyEnabled") ?? true;
  if (actionEconomyEnabled && game.combat?.started) {
    const actionType = getTimingAction(item.system.timing);
    if (actionType) {
      const combatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
      if (combatant) {
        const state = getActionState(combatant);
        const check = canPerformAction(state, actionType, actor);
        if (!check.allowed) {
          const reason = check.reason ? game.i18n.localize(check.reason) : "";
          ui.notifications.warn(reason || game.i18n.localize("ARIANRHOD.ActionBlocked"));
          return false;
        }
        const newState = consumeAction(state, actionType);
        await setActionState(combatant, newState);
      }
    }
  }

  // Deduct resources
  const updates = {};
  if (cost.mp > 0) {
    updates["system.combat.mp.value"] = actor.system.combat.mp.value - cost.mp;
  }
  if (cost.hp > 0) {
    updates["system.combat.hp.value"] = actor.system.combat.hp.value - cost.hp;
  }
  if (Object.keys(updates).length) {
    await actor.update(updates);
  }

  // Build cost display
  const costParts = [];
  if (cost.mp > 0) costParts.push(`MP ${cost.mp}`);
  if (cost.hp > 0) costParts.push(`HP ${cost.hp}`);
  const costDisplay = costParts.length ? costParts.join(" / ") : game.i18n.localize("ARIANRHOD.SkillNoCost");

  // Timing label
  const timingKey = item.system.timing ?? "";
  const timingLabel = timingKey
    ? game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[timingKey] ?? timingKey)
    : "";

  // Skill class label
  const allClasses = { ...CONFIG.ARIANRHOD.mainClasses, ...CONFIG.ARIANRHOD.supportClasses, general: "ARIANRHOD.GeneralSkills" };
  const skillClassLabel = game.i18n.localize(allClasses[item.system.skillClass] ?? item.system.skillClass);

  // Cost notice
  const costNotice = costParts.length ? costParts.map(p => `-${p}`).join(" / ") : "";

  // Render template
  const content = await renderTemplate(SKILL_CARD_TEMPLATE, {
    skillName: item.name,
    skillImg: item.img || "icons/svg/item-bag.svg",
    skillLevel,
    skillClassLabel,
    timingLabel,
    target: item.system.target ?? "",
    range: item.system.range ?? "",
    costDisplay,
    effect: item.system.effect ?? "",
    costNotice,
  });

  // Post chat message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });

  // Auto-apply structured effect
  if (hasStructuredEffect(item)) {
    const targets = [...(game.user.targets ?? [])].map(t => t.actor).filter(Boolean);
    await applySkillEffect(actor, item, targets);
  }

  // Break hidden on major/minor action
  const skillActionType = getTimingAction(item.system.timing);
  if (skillActionType === ACTION_TYPES.MAJOR || skillActionType === ACTION_TYPES.MINOR) {
    if (actor.hasStatusEffect?.("hidden")) {
      await actor.toggleStatusEffect("hidden");
      ui.notifications.info(game.i18n.format("ARIANRHOD.HiddenBroken", { name: actor.name }));
    }
  }

  // Block entering hidden state while engaged with enemies (rulebook p.239)
  if (item.system.effectId === "hidden" || item.name?.includes("隠密") || item.name?.includes("은밀")) {
    if (game.combat?.started) {
      const { isEngaged, getOpponents } = await import("./engagement.mjs");
      const combatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
      if (combatant) {
        const opponents = getOpponents(game.combat, combatant.id);
        if (opponents.length > 0) {
          ui.notifications.warn(game.i18n.localize("ARIANRHOD.HiddenCannotEngaged"));
          return false;
        }
      }
    }
  }

  // Auto-chain weapon attack for attack skills
  const skillLibId = item.getFlag("arianrhod2e", "skillId")
                  || item.getFlag("arianrhod2e", "libraryId");
  const attackData = skillLibId ? ATTACK_SKILL_MAP[skillLibId] : null;
  if (attackData) {
    const sl = item.system.level ?? 1;
    const skillBonus = {
      skillName: item.name,
      bonusDice: (attackData.bonusDicePerLevel ?? 0) * sl,
      bonusFlat: (attackData.bonusFlatPerLevel ?? 0) * sl,
      hitBonusDice: (attackData.hitBonusDice ?? 0) + (attackData.hitBonusDicePerLevel ?? 0) * sl,
      damageType: attackData.damageType ?? "",
      skipDamage: attackData.skipDamage ?? false,
    };
    await actor.rollAttack({ skillBonus });
  }

  // After-damage skill chaining (e.g., Treasure Hunt)
  const afterDamageData = skillLibId ? AFTER_DAMAGE_SKILL_MAP[skillLibId] : null;
  if (afterDamageData?.triggersDropRoll) {
    await _handleTreasureHunt(actor, item);
  }

  return true;
}

/**
 * Handle Treasure Hunt skill: trigger drop roll on targeted enemy.
 * Per rulebook: get one drop from the target enemy. If no drops set, gain [enemy level × 10]G.
 * Limited to SL uses per scenario.
 * @param {Actor} actor - The skill user
 * @param {Item} item - The treasure hunt skill item
 */
async function _handleTreasureHunt(actor, item) {
  const { findGuildForActor } = await import("./guild-support-effects.mjs");

  const sl = item.system.level ?? 1;
  const usedCount = actor.getFlag("arianrhod2e", "treasureHuntUsed") ?? 0;

  if (usedCount >= sl) {
    ui.notifications.warn(game.i18n.format("ARIANRHOD.SkillUsageLimitReached", { name: item.name, limit: sl }));
    return;
  }

  // Find target enemy
  const targets = [...(game.user.targets ?? [])].map(t => t.actor).filter(a => a?.type === "enemy");
  let targetEnemy;

  if (targets.length === 1) {
    targetEnemy = targets[0];
  } else if (targets.length > 1) {
    // Multiple targets: let GM pick
    const choices = targets.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("ARIANRHOD.TreasureHuntTarget") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("ARIANRHOD.SelectTarget")}</label><select name="targetId">${choices}</select></div></form>`,
      ok: {
        label: game.i18n.localize("ARIANRHOD.Confirm"),
        callback: (event, button) => button.form.querySelector('[name="targetId"]').value,
      },
      rejectClose: false,
    });
    if (!result) return;
    targetEnemy = game.actors.get(result);
  } else {
    // No target selected: try to find from combat
    if (game.combat?.started) {
      const enemies = game.combat.combatants
        .filter(c => c.actor?.type === "enemy" && c.actor.system?.combat?.hp?.value > 0)
        .map(c => c.actor);
      if (enemies.length === 1) {
        targetEnemy = enemies[0];
      } else if (enemies.length > 1) {
        const choices = enemies.map(a => `<option value="${a.id}">${a.name} (HP: ${a.system.combat.hp.value})</option>`).join("");
        const result = await foundry.applications.api.DialogV2.prompt({
          window: { title: game.i18n.localize("ARIANRHOD.TreasureHuntTarget") },
          content: `<form><div class="form-group"><label>${game.i18n.localize("ARIANRHOD.SelectTarget")}</label><select name="targetId">${choices}</select></div></form>`,
          ok: {
            label: game.i18n.localize("ARIANRHOD.Confirm"),
            callback: (event, button) => button.form.querySelector('[name="targetId"]').value,
          },
          rejectClose: false,
        });
        if (!result) return;
        targetEnemy = game.actors.get(result);
      }
    }
  }

  if (!targetEnemy) {
    ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoEnemyTarget"));
    return;
  }

  // Increment usage counter
  await actor.setFlag("arianrhod2e", "treasureHuntUsed", usedCount + 1);

  // Check if enemy has drops
  const dropsStr = targetEnemy.system.drops;
  if (dropsStr) {
    // Trigger drop roll on the enemy
    await targetEnemy.rollDropItems({ skipDialog: true });
  } else {
    // No drops: gain [enemy level × 10]G to guild gold
    const enemyLevel = targetEnemy.system.level ?? 1;
    const goldGain = enemyLevel * 10;
    const guild = findGuildForActor(actor);
    if (guild) {
      const currentGold = guild.system.gold ?? 0;
      await guild.update({ "system.gold": currentGold + goldGain });
    }
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-coins"></i> ${game.i18n.format("ARIANRHOD.TreasureHuntGold", { name: targetEnemy.name, gold: goldGain })}</div></div>`,
    });
  }
}
