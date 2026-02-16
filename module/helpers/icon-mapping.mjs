/**
 * Icon mappings for Arianrhod 2E item categories.
 * All paths reference verified Foundry VTT core icons from /icons/ prefix.
 */

// ---------------------------------------------------------------------------
// Weapon Icons
// ---------------------------------------------------------------------------

export const WEAPON_ICONS = {
  unarmed: "icons/weapons/fist/claw-gauntlet-gray.webp",
  dagger: "icons/weapons/daggers/dagger-black.webp",
  longsword: "icons/weapons/swords/greatsword-crossguard-silver.webp",
  greatsword: "icons/weapons/swords/greatsword-blue.webp",
  axe: "icons/weapons/axes/axe-battle-black.webp",
  spear: "icons/weapons/polearms/halberd-crescent-engraved-steel.webp",
  whip: "icons/weapons/misc/whip-red-yellow.webp",
  blunt: "icons/weapons/hammers/hammer-double-bronze.webp",
  bow: "icons/weapons/bows/longbow-gold-pink.webp",
  throwing: "icons/weapons/thrown/bolas-stone.webp",
  katana: "icons/weapons/swords/greatsword-crossguard-embossed-gold.webp",
  alchemy: "icons/tools/laboratory/bowl-liquid-orange.webp",
  other: "icons/svg/sword.svg",
};

// ---------------------------------------------------------------------------
// Armor Icons
// ---------------------------------------------------------------------------

export const ARMOR_ICONS = {
  head: "icons/equipment/head/cap-leather-brown.webp",
  body: "icons/equipment/chest/breastplate-banded-steel-grey.webp",
  shield: "icons/equipment/shield/buckler-wooden-boss-steel.webp",
  auxiliary: "icons/equipment/waist/belt-buckle-gold-blue.webp",
  other: "icons/svg/shield.svg",
};

// ---------------------------------------------------------------------------
// Item Icons
// ---------------------------------------------------------------------------

export const ITEM_ICONS = {
  potion: "icons/consumables/potions/bottle-bulb-corked-glowing-red.webp",
  food: "icons/consumables/food/bowl-stew-brown.webp",
  tool: "icons/tools/hand/hammer-and-nail.webp",
  container: "icons/containers/bags/case-simple-leather-brown.webp",
  arrow: "icons/weapons/ammunition/arrow-broadhead-white.webp",
  default: "icons/svg/item-bag.svg",
};

// ---------------------------------------------------------------------------
// Accessory Icons
// ---------------------------------------------------------------------------

export const ACCESSORY_ICONS = {
  ring: "icons/equipment/finger/ring-band-engraved-lines-gold.webp",
  necklace: "icons/equipment/neck/amulet-carved-stone-spiral-blue.webp",
  default: "icons/equipment/finger/ring-ball-gold.webp",
};

// ---------------------------------------------------------------------------
// Element Icons
// ---------------------------------------------------------------------------

export const ELEMENT_ICONS = {
  fire: "icons/magic/fire/beam-jet-stream-embers.webp",
  water: "icons/magic/water/barrier-ice-crystal-wall-faceted-blue.webp",
  wind: "icons/magic/air/air-burst-spiral-blue-gray.webp",
  earth: "icons/magic/earth/barrier-stone-brown-green.webp",
  light: "icons/magic/light/beam-rays-blue-large.webp",
  dark: "icons/magic/death/hand-undead-skeleton-fire-green.webp",
  none: "icons/svg/sword.svg",
};

// ---------------------------------------------------------------------------
// Skill Timing Icons
// ---------------------------------------------------------------------------

export const SKILL_TIMING_ICONS = {
  passive: "icons/magic/defensive/shield-barrier-blue.webp",
  setup: "icons/skills/social/diplomacy-handshake-blue.webp",
  initiative: "icons/skills/movement/arrow-upward-blue.webp",
  minor: "icons/skills/targeting/crosshair-bars-yellow.webp",
  move: "icons/skills/movement/feet-winged-boots-blue.webp",
  action: "icons/skills/melee/blade-tip-orange.webp",
  free: "icons/magic/movement/trail-streak-pink.webp",
  reaction: "icons/equipment/shield/buckler-wooden-boss-glowing-blue.webp",
  judge: "icons/svg/d20-grey.svg",
  damage: "icons/skills/melee/blood-slash-foam-red.webp",
  afterDamage: "icons/skills/wounds/blood-spurt-spray-red.webp",
  cleanup: "icons/magic/life/cross-beam-green.webp",
  item: "icons/svg/item-bag.svg",
  always: "icons/magic/defensive/armor-shield-barrier-steel.webp",
  other: "icons/svg/mystery-man.svg",
};

// ---------------------------------------------------------------------------
// Enemy Type Icons
// ---------------------------------------------------------------------------

export const ENEMY_TYPE_ICONS = {
  mob: "icons/svg/skull.svg",
  boss: "icons/svg/combat.svg",
  named: "icons/svg/aura.svg",
};

// ---------------------------------------------------------------------------
// Actor Default Icons
// ---------------------------------------------------------------------------

export const ACTOR_DEFAULT_ICONS = {
  character: "icons/svg/mystery-man.svg",
  enemy: "icons/creatures/magical/construct-iron-stomping-yellow.webp",
  guild: "icons/svg/tower.svg",
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getWeaponIcon(weaponType) {
  return WEAPON_ICONS[weaponType] || WEAPON_ICONS.other;
}

export function getArmorIcon(armorType) {
  return ARMOR_ICONS[armorType] || ARMOR_ICONS.other;
}

export function getItemIcon(itemType) {
  return ITEM_ICONS[itemType] || ITEM_ICONS.default;
}

export function getSkillIcon(timing) {
  return SKILL_TIMING_ICONS[timing] || SKILL_TIMING_ICONS.other;
}
