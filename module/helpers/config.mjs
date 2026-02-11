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
 * Race stat modifiers
 * Based on race skill data from Arianrhod 2E Rulebook (p.74-87)
 * Note: Huulin's 《만능》 skill allows player choice of 3 abilities for +1 each
 */
ARIANRHOD.raceData = {
  huulin: {
    // Player chooses 3 abilities for +1 each (special case, handled manually)
    abilityMods: {}
  },
  eldanaan: {
    // 《지의 축복》: +3 INT (most common choice)
    abilityMods: { int: 3 }
  },
  neverf: {
    // 《재의 축복》: +3 DEX
    abilityMods: { dex: 3 }
  },
  filbol: {
    // 《럭키》: +3 LUK
    abilityMods: { luk: 3 }
  },
  varna: {
    // 《민의 축복》: +3 AGI
    abilityMods: { agi: 3 }
  },
  duan: {
    // 《근의 축복》: +3 STR
    abilityMods: { str: 3 }
  },
  exmachina: {
    // Data incomplete in reference, no modifiers for now
    abilityMods: {}
  },
  dragonet: {
    // Data incomplete in reference, no modifiers for now
    abilityMods: {}
  },
  arsian: {
    // No direct stat modifiers mentioned in reference
    abilityMods: {}
  },
};

/**
 * Life Path tables
 * Based on Arianrhod 2E Rulebook (p.59-61)
 */
ARIANRHOD.lifePath = {
  origin: {
    "00": "ARIANRHOD.LifePathOrigin00",
    "11": "ARIANRHOD.LifePathOrigin11",
    "13": "ARIANRHOD.LifePathOrigin13",
    "15": "ARIANRHOD.LifePathOrigin15",
    "21": "ARIANRHOD.LifePathOrigin21",
    "23": "ARIANRHOD.LifePathOrigin23",
    "25": "ARIANRHOD.LifePathOrigin25",
    "31": "ARIANRHOD.LifePathOrigin31",
    "33": "ARIANRHOD.LifePathOrigin33",
    "35": "ARIANRHOD.LifePathOrigin35",
    "41": "ARIANRHOD.LifePathOrigin41",
    "43": "ARIANRHOD.LifePathOrigin43",
    "45": "ARIANRHOD.LifePathOrigin45",
    "51": "ARIANRHOD.LifePathOrigin51",
    "53": "ARIANRHOD.LifePathOrigin53",
    "55": "ARIANRHOD.LifePathOrigin55",
    "61": "ARIANRHOD.LifePathOrigin61",
    "63": "ARIANRHOD.LifePathOrigin63",
    "65": "ARIANRHOD.LifePathOrigin65",
    "77": "ARIANRHOD.LifePathOrigin77",
  },
  circumstance: {
    "00": "ARIANRHOD.LifePathCircumstance00",
    "11": "ARIANRHOD.LifePathCircumstance11",
    "13": "ARIANRHOD.LifePathCircumstance13",
    "15": "ARIANRHOD.LifePathCircumstance15",
    "21": "ARIANRHOD.LifePathCircumstance21",
    "23": "ARIANRHOD.LifePathCircumstance23",
    "25": "ARIANRHOD.LifePathCircumstance25",
    "31": "ARIANRHOD.LifePathCircumstance31",
    "33": "ARIANRHOD.LifePathCircumstance33",
    "35": "ARIANRHOD.LifePathCircumstance35",
    "41": "ARIANRHOD.LifePathCircumstance41",
    "43": "ARIANRHOD.LifePathCircumstance43",
    "45": "ARIANRHOD.LifePathCircumstance45",
    "51": "ARIANRHOD.LifePathCircumstance51",
    "53": "ARIANRHOD.LifePathCircumstance53",
    "55": "ARIANRHOD.LifePathCircumstance55",
    "61": "ARIANRHOD.LifePathCircumstance61",
    "63": "ARIANRHOD.LifePathCircumstance63",
    "65": "ARIANRHOD.LifePathCircumstance65",
  },
  objective: {
    "00": "ARIANRHOD.LifePathObjective00",
    "11": "ARIANRHOD.LifePathObjective11",
    "13": "ARIANRHOD.LifePathObjective13",
    "15": "ARIANRHOD.LifePathObjective15",
    "21": "ARIANRHOD.LifePathObjective21",
    "23": "ARIANRHOD.LifePathObjective23",
    "25": "ARIANRHOD.LifePathObjective25",
    "31": "ARIANRHOD.LifePathObjective31",
    "33": "ARIANRHOD.LifePathObjective33",
    "35": "ARIANRHOD.LifePathObjective35",
    "41": "ARIANRHOD.LifePathObjective41",
    "43": "ARIANRHOD.LifePathObjective43",
    "45": "ARIANRHOD.LifePathObjective45",
    "51": "ARIANRHOD.LifePathObjective51",
    "53": "ARIANRHOD.LifePathObjective53",
    "55": "ARIANRHOD.LifePathObjective55",
    "61": "ARIANRHOD.LifePathObjective61",
    "63": "ARIANRHOD.LifePathObjective63",
    "65": "ARIANRHOD.LifePathObjective65",
  },
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
