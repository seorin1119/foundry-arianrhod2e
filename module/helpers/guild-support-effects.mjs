/**
 * Guild Support Effects Engine for Arianrhod 2E
 * Applies the 54 guild support effects to actual gameplay mechanics.
 * Supports from guild-supports.mjs are looked up and their passive/active
 * bonuses are computed here.
 */

/**
 * Find the guild that an actor belongs to.
 * @param {Actor} actor - The actor to find a guild for
 * @returns {Actor|null} The guild actor, or null
 */
export function findGuildForActor(actor) {
  if (!actor || !game.actors) return null;
  return game.actors.find(a =>
    a.type === "guild" &&
    a.system.members?.some(m => m.actorId === actor.id)
  ) ?? null;
}

/**
 * Get active supports for a guild, with duplicate counts.
 * @param {Actor} guild - The guild actor
 * @returns {Array<{supportId: string, data: object, count: number}>}
 */
export function getActiveSupports(guild) {
  if (!guild?.system?.supports) return [];
  const library = CONFIG.ARIANRHOD?.guildSupports ?? [];
  const counts = new Map();

  for (const s of guild.system.supports) {
    const existing = counts.get(s.supportId);
    if (existing) {
      existing.count += 1;
    } else {
      const data = library.find(gs => gs.id === s.supportId);
      if (data) counts.set(s.supportId, { supportId: s.supportId, data, count: 1 });
    }
  }
  return Array.from(counts.values());
}

/**
 * Count how many times a specific support is selected.
 * @param {Actor} guild - The guild actor
 * @param {string} supportId - The support ID to count
 * @returns {number}
 */
function countSupport(guild, supportId) {
  if (!guild?.system?.supports) return 0;
  return guild.system.supports.filter(s => s.supportId === supportId).length;
}

/**
 * Check if a guild has a specific support (at least once).
 * @param {Actor} guild - The guild actor
 * @param {string} supportId - The support ID
 * @returns {boolean}
 */
function hasSupport(guild, supportId) {
  return countSupport(guild, supportId) > 0;
}

/**
 * Get all passive bonuses for an actor from their guild supports.
 * Returns a bonuses object with all applicable modifiers.
 * @param {Actor} actor - The character actor
 * @returns {object} Bonuses object
 */
export function getPassiveBonuses(actor) {
  const bonuses = {
    hpDamageReduction: 0,     // blessing: -2 per count
    dropBonusDice: 0,         // marauder: +1D per count
    attackDamageFlat: 0,      // attack_boost: +3 per count
    physDefBonus: 0,          // defense_boost: +4 per count
    magDefBonus: 0,           // defense_boost: +4 per count
    maxHpBonus: 0,            // gh_bathhouse +10, gh_mansion +20, elite +5 per count
    maxMpBonus: 0,            // gh_tavern +10, gh_garden +20, elite +5 per count
    initiativeBonus: 0,       // acceleration: +5 per count
    carryCapacityBonus: 0,    // porter: +5 per count
    scoutCheckBonus: 0,       // scout: +2 per count (danger, trap, enemy ID, info)
    magicCheckBonus: 0,       // book_of_secrets: +2
    potionBonus: 0,           // pharmacist: +3, gh_alchemy_workshop: +2D
    foodBonus: 0,             // cook: +3
    shopDiscount: 0,          // discount: 10% per count
    shopSellBonus: 0,         // gh_shop: +10%
    trainingGroundsDamage: 0, // gh_training_grounds: +2D (as dice count)
    hpRecoveryBonus: 0,       // gh_inn: +1D (as dice count)
    trainingHallRecovery: 0,  // gh_training_hall: +2D (as dice count)
    templeRecoveryFlat: 0,    // gh_temple: +[GL+3]
    fortressPhysDef: 0,       // gh_fortress: +20
    cathedralMagDef: 0,       // gh_cathedral: +20
    negotiationBonus: 0,      // negotiation: 10% per count
  };

  const guild = findGuildForActor(actor);
  if (!guild) return bonuses;

  const gl = guild.system.guildLevel ?? 1;

  // Stackable supports (duplicate: true)
  bonuses.hpDamageReduction = countSupport(guild, "blessing") * 2;
  bonuses.dropBonusDice = countSupport(guild, "marauder");
  bonuses.attackDamageFlat = countSupport(guild, "attack_boost") * 3;

  const defCount = countSupport(guild, "defense_boost");
  bonuses.physDefBonus = defCount * 4;
  bonuses.magDefBonus = defCount * 4;

  bonuses.initiativeBonus = countSupport(guild, "acceleration") * 5;
  bonuses.carryCapacityBonus = countSupport(guild, "porter") * 5;
  bonuses.scoutCheckBonus = countSupport(guild, "scout") * 2;
  bonuses.negotiationBonus = countSupport(guild, "negotiation") * 10;

  const eliteCount = countSupport(guild, "elite");
  bonuses.maxHpBonus += eliteCount * 5;
  bonuses.maxMpBonus += eliteCount * 5;

  // Non-stackable supports (duplicate: false)
  if (hasSupport(guild, "book_of_secrets")) bonuses.magicCheckBonus = 2;
  if (hasSupport(guild, "pharmacist")) bonuses.potionBonus = 3;
  if (hasSupport(guild, "cook")) bonuses.foodBonus = 3;
  if (hasSupport(guild, "discount")) bonuses.shopDiscount = 10;
  if (hasSupport(guild, "gh_shop")) bonuses.shopSellBonus = 10;

  // Guild Hall supports
  if (hasSupport(guild, "gh_bathhouse")) bonuses.maxHpBonus += 10;
  if (hasSupport(guild, "gh_tavern")) bonuses.maxMpBonus += 10;
  if (hasSupport(guild, "gh_mansion")) bonuses.maxHpBonus += 20;
  if (hasSupport(guild, "gh_garden")) bonuses.maxMpBonus += 20;
  if (hasSupport(guild, "gh_fortress")) bonuses.fortressPhysDef = 20;
  if (hasSupport(guild, "gh_cathedral")) bonuses.cathedralMagDef = 20;
  if (hasSupport(guild, "gh_training_grounds")) bonuses.trainingGroundsDamage = 2; // +2D
  if (hasSupport(guild, "gh_inn")) bonuses.hpRecoveryBonus = 1; // +1D
  if (hasSupport(guild, "gh_training_hall")) bonuses.trainingHallRecovery = 2; // +2D
  if (hasSupport(guild, "gh_temple")) bonuses.templeRecoveryFlat = gl + 3;

  // Alchemy workshop adds +2D to potion effects (stored separately)
  if (hasSupport(guild, "gh_alchemy_workshop")) bonuses.potionBonus += 0; // Handled via dice, not flat

  return bonuses;
}

/**
 * Apply damage reduction from guild supports (blessing).
 * @param {Actor} actor - The actor taking damage
 * @param {number} damage - The raw damage amount
 * @returns {number} Modified damage after reduction
 */
export function applyDamageReduction(actor, damage) {
  const bonuses = getPassiveBonuses(actor);
  if (bonuses.hpDamageReduction <= 0) return damage;
  return Math.max(0, damage - bonuses.hpDamageReduction);
}

/**
 * Get bonus dice for drop item rolls (marauder support).
 * @param {Actor} actor - The actor (enemy whose drops are being rolled, but check killer's guild)
 * @returns {number} Number of bonus dice
 */
export function getDropBonusDice(actor) {
  const bonuses = getPassiveBonuses(actor);
  return bonuses.dropBonusDice;
}

/**
 * Get flat attack damage bonus from guild supports.
 * Includes attack_boost (+3 per count).
 * @param {Actor} actor - The attacking actor
 * @returns {number} Flat damage bonus
 */
export function getAttackDamageBonus(actor) {
  const bonuses = getPassiveBonuses(actor);
  return bonuses.attackDamageFlat;
}

/**
 * Get bonus damage dice from guild supports (gh_training_grounds).
 * @param {Actor} actor - The attacking actor
 * @returns {number} Number of bonus damage dice
 */
export function getAttackDamageBonusDice(actor) {
  const bonuses = getPassiveBonuses(actor);
  return bonuses.trainingGroundsDamage;
}

/**
 * Get shop discount percentage for an actor.
 * @param {Actor} actor - The buying actor
 * @returns {number} Discount percentage (0-100)
 */
export function getShopDiscount(actor) {
  const bonuses = getPassiveBonuses(actor);
  return bonuses.shopDiscount;
}

/**
 * Get shop sell bonus percentage for an actor.
 * @param {Actor} actor - The selling actor
 * @returns {number} Sell bonus percentage (0-100)
 */
export function getShopSellBonus(actor) {
  const bonuses = getPassiveBonuses(actor);
  return bonuses.shopSellBonus;
}
