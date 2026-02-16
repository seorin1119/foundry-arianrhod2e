/**
 * Engagement System for Arianrhod 2E.
 * Engagements represent groups of combatants in melee contact.
 * Arianrhod uses abstract distance, so engagements are managed by GM, not physical tokens.
 *
 * Data stored in: combat.flags.arianrhod2e.engagements
 * Structure: [{ id: string, members: string[] }]  (member = combatant ID)
 */

/**
 * Get all engagements from combat (deep clone to prevent mutation of flag data).
 * @param {Combat} combat
 * @returns {object[]} Array of engagement objects
 */
export function getEngagements(combat) {
  const raw = combat?.getFlag("arianrhod2e", "engagements");
  if (!raw) return [];
  return foundry.utils.deepClone(raw);
}

/**
 * Create a new engagement between two combatants.
 * If either combatant is already in an engagement, they are merged.
 * @param {Combat} combat
 * @param {string} combatantId1
 * @param {string} combatantId2
 * @returns {Promise<string>} engagement ID
 */
export async function createEngagement(combat, combatantId1, combatantId2) {
  const engagements = getEngagements(combat);

  // Check if either combatant is already in an engagement
  const existing1 = findEngagement(engagements, combatantId1);
  const existing2 = findEngagement(engagements, combatantId2);

  if (existing1 && existing2 && existing1.id === existing2.id) {
    // Already in same engagement
    return existing1.id;
  }

  if (existing1 && !existing2) {
    // Add combatant2 to existing engagement of combatant1
    existing1.members.push(combatantId2);
    await combat.setFlag("arianrhod2e", "engagements", engagements);
    return existing1.id;
  }

  if (!existing1 && existing2) {
    // Add combatant1 to existing engagement of combatant2
    existing2.members.push(combatantId1);
    await combat.setFlag("arianrhod2e", "engagements", engagements);
    return existing2.id;
  }

  if (existing1 && existing2) {
    // Merge two engagements
    const merged = [...new Set([...existing1.members, ...existing2.members])];
    existing1.members = merged;
    const idx = engagements.findIndex(e => e.id === existing2.id);
    if (idx >= 0) engagements.splice(idx, 1);
    await combat.setFlag("arianrhod2e", "engagements", engagements);
    return existing1.id;
  }

  // Create new engagement
  const newId = foundry.utils.randomID();
  engagements.push({ id: newId, members: [combatantId1, combatantId2] });
  await combat.setFlag("arianrhod2e", "engagements", engagements);
  return newId;
}

/**
 * Remove a combatant from their engagement (disengage).
 * If the engagement has fewer than 2 members afterward, it is removed.
 * @param {Combat} combat
 * @param {string} combatantId
 */
export async function removeFromEngagement(combat, combatantId) {
  const engagements = getEngagements(combat);
  const engagement = findEngagement(engagements, combatantId);
  if (!engagement) return;

  engagement.members = engagement.members.filter(id => id !== combatantId);

  // Remove engagement if less than 2 members
  if (engagement.members.length < 2) {
    const idx = engagements.findIndex(e => e.id === engagement.id);
    if (idx >= 0) engagements.splice(idx, 1);
  }

  await combat.setFlag("arianrhod2e", "engagements", engagements);
}

/**
 * Find which engagement a combatant belongs to.
 * @param {object[]} engagements - Array of engagement objects
 * @param {string} combatantId
 * @returns {object|null} The engagement containing this combatant, or null
 */
export function findEngagement(engagements, combatantId) {
  return engagements.find(e => e.members.includes(combatantId)) ?? null;
}

/**
 * Check if two combatants are in the same engagement (melee range).
 * @param {Combat} combat
 * @param {string} combatantId1
 * @param {string} combatantId2
 * @returns {boolean}
 */
export function areEngaged(combat, combatantId1, combatantId2) {
  const engagements = getEngagements(combat);
  const eng = findEngagement(engagements, combatantId1);
  return eng ? eng.members.includes(combatantId2) : false;
}

/**
 * Check if a combatant is in any engagement.
 * @param {Combat} combat
 * @param {string} combatantId
 * @returns {boolean}
 */
export function isEngaged(combat, combatantId) {
  const engagements = getEngagements(combat);
  return findEngagement(engagements, combatantId) !== null;
}

/**
 * Get all combatant IDs engaged with a given combatant.
 * @param {Combat} combat
 * @param {string} combatantId
 * @returns {string[]} Array of combatant IDs (excluding the queried combatant)
 */
export function getEngagedWith(combat, combatantId) {
  const engagements = getEngagements(combat);
  const eng = findEngagement(engagements, combatantId);
  if (!eng) return [];
  return eng.members.filter(id => id !== combatantId);
}

/**
 * Get opponents (opposing side combatants) in the same engagement.
 * Opponents are combatants of a different actor type (character vs enemy).
 * Only returns combatants that are alive (HP > 0).
 * @param {Combat} combat
 * @param {string} combatantId
 * @returns {Combatant[]} Array of opponent combatants
 */
export function getOpponents(combat, combatantId) {
  const engagements = getEngagements(combat);
  const eng = findEngagement(engagements, combatantId);
  if (!eng) return [];

  const combatant = combat.combatants.get(combatantId);
  if (!combatant?.actor) return [];
  const myType = combatant.actor.type;

  return eng.members
    .filter(id => id !== combatantId)
    .map(id => combat.combatants.get(id))
    .filter(c => c?.actor && c.actor.type !== myType && (c.actor.system?.combat?.hp?.value ?? 1) > 0);
}

/**
 * Clear all engagements (e.g., when combat ends).
 * @param {Combat} combat
 */
export async function clearAllEngagements(combat) {
  await combat.setFlag("arianrhod2e", "engagements", []);
}

/**
 * Get a display-friendly summary of all engagements.
 * Resolves combatant IDs to names for UI display.
 * @param {Combat} combat
 * @returns {object[]} Array of { id, members: { id, name }[] }
 */
export function getEngagementSummary(combat) {
  const engagements = getEngagements(combat);
  return engagements.map(eng => ({
    id: eng.id,
    members: eng.members.map(memberId => {
      const combatant = combat.combatants.get(memberId);
      return {
        id: memberId,
        name: combatant?.name ?? game.i18n.localize("ARIANRHOD.Unknown"),
      };
    }),
  }));
}

/**
 * Validate melee attack: attacker must be engaged with target.
 * Ranged attacks have no engagement requirement.
 * @param {Combat} combat
 * @param {Actor} attacker
 * @param {Actor} target
 * @param {boolean} isRanged - Whether the attack is ranged
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function validateAttackEngagement(combat, attacker, target, isRanged = false) {
  if (!combat?.started) return { allowed: true };

  // Check if engagement system is enabled in settings
  const enabled = game.settings?.get("arianrhod2e", "engagementEnabled") ?? true;
  if (!enabled) return { allowed: true };

  // Find combatants for attacker and target
  const attackerCombatant = combat.combatants.find(c => c.actor?.id === attacker.id);
  const targetCombatant = combat.combatants.find(c => c.actor?.id === target.id);

  // If either is not in combat, allow the attack (safety fallback)
  if (!attackerCombatant || !targetCombatant) return { allowed: true };

  if (isRanged) {
    // Ranged attacks CANNOT target characters in the same engagement as the attacker (rulebook p.221)
    if (areEngaged(combat, attackerCombatant.id, targetCombatant.id)) {
      return { allowed: false, reason: "ARIANRHOD.RangedAttackEngaged" };
    }
    return { allowed: true };
  }

  // Melee attacks require engagement
  if (!areEngaged(combat, attackerCombatant.id, targetCombatant.id)) {
    return { allowed: false, reason: "ARIANRHOD.AttackNotEngaged" };
  }
  return { allowed: true };
}
