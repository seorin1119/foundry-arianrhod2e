/**
 * Effect Processor for Arianrhod 2E.
 * Converts structured skill effect data into Foundry ActiveEffects.
 */

/**
 * Apply a structured effect from a skill activation.
 * @param {Actor} actor - The actor using the skill
 * @param {Item} skill - The skill item
 * @param {object[]} targets - Array of target actors (empty = self)
 * @returns {Promise<void>}
 */
export async function applySkillEffect(actor, skill, targets = []) {
  const effect = skill.system.structuredEffect;
  if (!effect || !effect.type) return;

  const effectTargets = _resolveTargets(actor, skill, targets);

  for (const target of effectTargets) {
    switch (effect.type) {
      case "buff":
      case "debuff":
        await _applyStatModifier(target, skill, effect);
        break;
      case "heal":
        await _applyHeal(target, effect);
        break;
      case "damage":
        await _applyEffectDamage(target, effect);
        break;
      case "status":
        await _applyStatusEffect(target, effect);
        break;
      case "removeStatus":
        await _removeStatusEffect(target, effect);
        break;
    }
  }
}

/**
 * Resolve target actors based on skill target type.
 * @param {Actor} actor - The actor using the skill
 * @param {Item} skill - The skill item
 * @param {Actor[]} targets - Explicitly provided target actors
 * @returns {Actor[]}
 */
function _resolveTargets(actor, skill, targets) {
  const targetType = skill.system.target ?? "";

  // Self-targeting skills
  if (targetType === "\u81EA\u8EAB" || targetType === "self") return [actor];

  // If explicit targets provided, use them
  if (targets.length > 0) return targets;

  // Fall back to game user targets
  const gameTargets = [...(game.user.targets ?? [])]
    .map(t => t.actor)
    .filter(Boolean);
  if (gameTargets.length > 0) return gameTargets;

  // Default to self
  return [actor];
}

/**
 * Apply a stat modifier as an ActiveEffect.
 * @param {Actor} actor - Target actor
 * @param {Item} skill - The skill item providing the effect
 * @param {object} effect - The structured effect data
 */
async function _applyStatModifier(actor, skill, effect) {
  const mode = CONST.ACTIVE_EFFECT_MODES.ADD;
  const value = effect.type === "debuff"
    ? -Math.abs(effect.value)
    : Math.abs(effect.value);

  const statKeyMap = {
    accuracy: "system.combat.accuracy",
    evasion: "system.combat.evasion",
    physDef: "system.combat.physDef",
    magDef: "system.combat.magDef",
    attack: "system.combat.attack",
    initiative: "system.combat.initiative",
    movement: "system.combat.movement",
  };

  const key = statKeyMap[effect.stat];
  if (!key) return;

  const duration = _resolveDuration(effect.duration);

  const effectData = {
    name: `${skill.name} (${effect.type === "buff" ? "+" : ""}${value})`,
    icon: skill.img || "icons/svg/aura.svg",
    changes: [{
      key,
      mode,
      value: String(value),
    }],
    duration,
    flags: {
      arianrhod2e: {
        skillEffect: true,
        sourceSkillId: skill.id,
        sourceActorId: skill.parent?.id,
      },
    },
  };

  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

  // Notify
  const label = game.i18n.localize(`ARIANRHOD.Stat_${effect.stat}`) || effect.stat;
  const sign = value > 0 ? "+" : "";
  ui.notifications.info(`${actor.name}: ${skill.name} \u2192 ${label} ${sign}${value}`);
}

/**
 * Apply healing effect.
 * @param {Actor} actor - Target actor
 * @param {object} effect - The structured effect data
 */
async function _applyHeal(actor, effect) {
  const resource = effect.resource ?? "hp";
  const path = resource === "mp" ? "system.combat.mp" : "system.combat.hp";
  const current = resource === "mp"
    ? actor.system.combat?.mp
    : actor.system.combat?.hp;
  if (!current) return;

  const healAmount = effect.value ?? 0;
  if (healAmount <= 0) return;

  const newVal = Math.min(current.max, current.value + healAmount);
  // Pass incapacitationRecovery flag so healing is not blocked for incapacitated actors (HP=0)
  const updateOpts = resource === "hp" ? { arianrhod2e: { incapacitationRecovery: true } } : {};
  await actor.update({ [`${path}.value`]: newVal }, updateOpts);

  const actualVal = actor.system.combat?.[resource]?.value ?? newVal;
  ui.notifications.info(
    `${actor.name}: ${resource.toUpperCase()} +${healAmount} (${current.value} \u2192 ${actualVal})`
  );
}

/**
 * Apply direct damage from effect.
 * @param {Actor} actor - Target actor
 * @param {object} effect - The structured effect data
 */
async function _applyEffectDamage(actor, effect) {
  const dmg = effect.value ?? 0;
  if (dmg <= 0) return;

  const hp = actor.system.combat?.hp;
  if (!hp) return;

  const newHP = Math.max(0, hp.value - dmg);
  await actor.update({ "system.combat.hp.value": newHP });

  ui.notifications.info(
    `${actor.name}: HP -${dmg} (${hp.value} \u2192 ${newHP})`
  );
}

/**
 * Apply a status effect.
 * @param {Actor} actor - Target actor
 * @param {object} effect - The structured effect data
 */
async function _applyStatusEffect(actor, effect) {
  if (!effect.statusId) return;

  // Already has it -- do not duplicate
  if (actor.hasStatusEffect?.(effect.statusId)) return;

  await actor.toggleStatusEffect(effect.statusId);

  // Set value flag for statuses with magnitude (poison(n), knockback(n))
  if (effect.statusValue) {
    const flagKey = `${effect.statusId}Value`;
    await actor.setFlag("arianrhod2e", flagKey, effect.statusValue);
  }
}

/**
 * Remove a status effect.
 * @param {Actor} actor - Target actor
 * @param {object} effect - The structured effect data
 */
async function _removeStatusEffect(actor, effect) {
  if (!effect.statusId) return;
  if (!actor.hasStatusEffect?.(effect.statusId)) return;
  await actor.toggleStatusEffect(effect.statusId);
}

/**
 * Resolve duration object for ActiveEffect.
 * @param {string} durationStr - Duration keyword
 * @returns {object} Foundry-compatible duration object
 */
function _resolveDuration(durationStr) {
  switch (durationStr) {
    case "round":
      return { rounds: 1 };
    case "3rounds":
      return { rounds: 3 };
    case "scene":
      return { type: "special" };
    case "combat":
      return { type: "special" };
    case "instant":
    default:
      return { rounds: 0 };
  }
}

/**
 * Clean up expired skill effects at cleanup phase.
 * Should be called at the end of a combatant's turn or at round end.
 * @param {Actor} actor - The actor whose effects to check
 */
export async function cleanupExpiredEffects(actor) {
  const toDelete = [];
  for (const effect of actor.effects) {
    if (!effect.flags?.arianrhod2e?.skillEffect) continue;
    // Check if duration has expired
    if (effect.duration?.remaining === 0) {
      toDelete.push(effect.id);
    }
  }
  if (toDelete.length > 0) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
  }
}

/**
 * Check if a skill has a structured effect defined.
 * @param {Item} skill - The skill item to check
 * @returns {boolean}
 */
export function hasStructuredEffect(skill) {
  const effect = skill?.system?.structuredEffect;
  return !!(effect && effect.type);
}
