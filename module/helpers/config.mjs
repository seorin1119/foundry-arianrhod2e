export const ARIANRHOD = {};

/**
 * Ability score definitions for Arianrhod RPG 2E
 */
ARIANRHOD.abilities = {
  str: "ARIANRHOD.AbilityStr",
  dex: "ARIANRHOD.AbilityDex",
  agi: "ARIANRHOD.AbilityAgi",
  int: "ARIANRHOD.AbilityInt",
  sen: "ARIANRHOD.AbilitySen",
  men: "ARIANRHOD.AbilityMen",
  luk: "ARIANRHOD.AbilityLuk",
};

ARIANRHOD.abilityAbbreviations = {
  str: "ARIANRHOD.AbilityStrAbbr",
  dex: "ARIANRHOD.AbilityDexAbbr",
  agi: "ARIANRHOD.AbilityAgiAbbr",
  int: "ARIANRHOD.AbilityIntAbbr",
  sen: "ARIANRHOD.AbilitySenAbbr",
  men: "ARIANRHOD.AbilityMenAbbr",
  luk: "ARIANRHOD.AbilityLukAbbr",
};

/**
 * Weapon types
 */
ARIANRHOD.weaponTypes = {
  sword: "ARIANRHOD.WeaponTypeSword",
  axe: "ARIANRHOD.WeaponTypeAxe",
  spear: "ARIANRHOD.WeaponTypeSpear",
  bow: "ARIANRHOD.WeaponTypeBow",
  staff: "ARIANRHOD.WeaponTypeStaff",
  fist: "ARIANRHOD.WeaponTypeFist",
  gun: "ARIANRHOD.WeaponTypeGun",
  other: "ARIANRHOD.WeaponTypeOther",
};

/**
 * Armor types
 */
ARIANRHOD.armorTypes = {
  head: "ARIANRHOD.ArmorTypeHead",
  body: "ARIANRHOD.ArmorTypeBody",
  shield: "ARIANRHOD.ArmorTypeShield",
  auxiliary: "ARIANRHOD.ArmorTypeAuxiliary",
  other: "ARIANRHOD.ArmorTypeOther",
};

/**
 * Equipment slots
 */
ARIANRHOD.equipSlots = {
  right: "ARIANRHOD.SlotRight",
  left: "ARIANRHOD.SlotLeft",
  head: "ARIANRHOD.SlotHead",
  body: "ARIANRHOD.SlotBody",
  accessory1: "ARIANRHOD.SlotAccessory1",
  accessory2: "ARIANRHOD.SlotAccessory2",
};

/**
 * Skill timing types
 */
ARIANRHOD.skillTimings = {
  passive: "ARIANRHOD.TimingPassive",
  setup: "ARIANRHOD.TimingSetup",
  initiative: "ARIANRHOD.TimingInitiative",
  action: "ARIANRHOD.TimingAction",
  judge: "ARIANRHOD.TimingJudge",
  damage: "ARIANRHOD.TimingDamage",
  afterDamage: "ARIANRHOD.TimingAfterDamage",
  cleanup: "ARIANRHOD.TimingCleanup",
  always: "ARIANRHOD.TimingAlways",
  other: "ARIANRHOD.TimingOther",
};

/**
 * Race options
 */
ARIANRHOD.races = {
  huulin: "ARIANRHOD.RaceHuulin",
  eldanaan: "ARIANRHOD.RaceEldanaan",
  neverf: "ARIANRHOD.RaceNeverf",
  filbol: "ARIANRHOD.RaceFilbol",
  varna: "ARIANRHOD.RaceVarna",
  duan: "ARIANRHOD.RaceDuan",
  exmachina: "ARIANRHOD.RaceExmachina",
  dragonet: "ARIANRHOD.RaceDragonet",
  arsian: "ARIANRHOD.RaceArsian",
};

/**
 * Enemy types
 */
ARIANRHOD.enemyTypes = {
  mob: "ARIANRHOD.EnemyTypeMob",
  boss: "ARIANRHOD.EnemyTypeBoss",
  named: "ARIANRHOD.EnemyTypeNamed",
};

/**
 * Main class options (メインクラス)
 */
ARIANRHOD.mainClasses = {
  warrior: "ARIANRHOD.ClassWarrior",
  acolyte: "ARIANRHOD.ClassAcolyte",
  mage: "ARIANRHOD.ClassMage",
  thief: "ARIANRHOD.ClassThief",
};

/**
 * Support class options (サポートクラス)
 */
ARIANRHOD.supportClasses = {
  warrior: "ARIANRHOD.ClassWarrior",
  acolyte: "ARIANRHOD.ClassAcolyte",
  mage: "ARIANRHOD.ClassMage",
  thief: "ARIANRHOD.ClassThief",
  gunslinger: "ARIANRHOD.ClassGunslinger",
  ninja: "ARIANRHOD.ClassNinja",
  dancer: "ARIANRHOD.ClassDancer",
  ranger: "ARIANRHOD.ClassRanger",
  monk: "ARIANRHOD.ClassMonk",
  bard: "ARIANRHOD.ClassBard",
  samurai: "ARIANRHOD.ClassSamurai",
  summoner: "ARIANRHOD.ClassSummoner",
  sage: "ARIANRHOD.ClassSage",
  alchemist: "ARIANRHOD.ClassAlchemist",
};

/**
 * Class data including HP/MP growth and ability modifiers
 * Based on Arianrhod 2E Rulebook p.62
 */
ARIANRHOD.classData = {
  warrior: {
    initialHp: 13,
    hpGrowth: 7,
    initialMp: 11,
    mpGrowth: 3,
    abilityMods: { str: 1, dex: 1, agi: 1 }
  },
  acolyte: {
    initialHp: 11,
    hpGrowth: 5,
    initialMp: 12,
    mpGrowth: 4,
    abilityMods: { dex: 1, men: 1 }
  },
  mage: {
    initialHp: 10,
    hpGrowth: 4,
    initialMp: 13,
    mpGrowth: 4,
    abilityMods: { int: 1, sen: 1 }
  },
  thief: {
    initialHp: 12,
    hpGrowth: 6,
    initialMp: 11,
    mpGrowth: 3,
    abilityMods: { dex: 1, sen: 1 }
  },
  gunslinger: {
    initialHp: 12,
    hpGrowth: 4,
    initialMp: 11,
    mpGrowth: 3,
    abilityMods: { dex: 1 }
  },
  ninja: {
    initialHp: 10,
    hpGrowth: 6,
    initialMp: 11,
    mpGrowth: 3,
    abilityMods: { men: 1 }
  },
  dancer: {
    initialHp: 11,
    hpGrowth: 7,
    initialMp: 13,
    mpGrowth: 3,
    abilityMods: { dex: 1 }
  },
  ranger: {
    initialHp: 12,
    hpGrowth: 5,
    initialMp: 12,
    mpGrowth: 3,
    abilityMods: { men: 1 }
  },
  monk: {
    initialHp: 12,
    hpGrowth: 6,
    initialMp: 11,
    mpGrowth: 3,
    abilityMods: { men: 1 }
  },
  bard: {
    initialHp: 10,
    hpGrowth: 5,
    initialMp: 13,
    mpGrowth: 4,
    abilityMods: { sen: 1 }
  },
  samurai: {
    initialHp: 12,
    hpGrowth: 7,
    initialMp: 12,
    mpGrowth: 3,
    abilityMods: { str: 1 }
  },
  summoner: {
    initialHp: 8,
    hpGrowth: 4,
    initialMp: 15,
    mpGrowth: 5,
    abilityMods: { int: 1 }
  },
  sage: {
    initialHp: 9,
    hpGrowth: 4,
    initialMp: 14,
    mpGrowth: 4,
    abilityMods: { sen: 1 }
  },
  alchemist: {
    initialHp: 10,
    hpGrowth: 5,
    initialMp: 13,
    mpGrowth: 4,
    abilityMods: { int: 1 }
  },
};
