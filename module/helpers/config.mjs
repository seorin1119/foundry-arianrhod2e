import { skillLibrary } from "./skill-library.mjs";
import { equipmentLibrary } from "./equipment-library.mjs";
import { guildSupports } from "./guild-supports.mjs";
import { enemySkillLibrary } from "./enemy-skill-library.mjs";

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
 * Weapon types (categories matching equipment library)
 */
ARIANRHOD.weaponTypes = {
  unarmed: "ARIANRHOD.WeaponTypeUnarmed",
  dagger: "ARIANRHOD.WeaponTypeDagger",
  longsword: "ARIANRHOD.WeaponTypeLongsword",
  greatsword: "ARIANRHOD.WeaponTypeGreatsword",
  axe: "ARIANRHOD.WeaponTypeAxe",
  spear: "ARIANRHOD.WeaponTypeSpear",
  whip: "ARIANRHOD.WeaponTypeWhip",
  blunt: "ARIANRHOD.WeaponTypeBlunt",
  bow: "ARIANRHOD.WeaponTypeBow",
  throwing: "ARIANRHOD.WeaponTypeThrowing",
  katana: "ARIANRHOD.WeaponTypeKatana",
  alchemy: "ARIANRHOD.WeaponTypeAlchemy",
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
  minor: "ARIANRHOD.TimingMinor",
  move: "ARIANRHOD.TimingMove",
  action: "ARIANRHOD.TimingAction",
  free: "ARIANRHOD.TimingFree",
  reaction: "ARIANRHOD.TimingReaction",
  judge: "ARIANRHOD.TimingJudge",
  damage: "ARIANRHOD.TimingDamage",
  afterDamage: "ARIANRHOD.TimingAfterDamage",
  cleanup: "ARIANRHOD.TimingCleanup",
  item: "ARIANRHOD.TimingItem",
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
    abilityMods: {},
    passiveEffects: [], // 《만능》: manual ability selection
  },
  eldanaan: {
    // 《지의 축복》: +3 INT (most common choice)
    abilityMods: { int: 3 },
    passiveEffects: [{ type: "darkvision" }], // 《다크비전》: darkness penalty immune
  },
  neverf: {
    // 《재의 축복》: +3 DEX
    abilityMods: { dex: 3 },
    passiveEffects: [{ type: "lightProtection", element: "light", reduction: 5 }], // 《빛의 보호》: light damage -5
  },
  filbol: {
    // 《럭키》: +3 LUK
    abilityMods: { luk: 3 },
    passiveEffects: [{ type: "halfSize" }], // 《하프》: small equipment only
  },
  varna: {
    // 《민의 축복》: +3 AGI
    abilityMods: { agi: 3 },
    passiveEffects: [{ type: "flightCapable" }], // 《비행 능력》: can gain flight status
  },
  duan: {
    // 《근의 축복》: +3 STR
    abilityMods: { str: 3 },
    passiveEffects: [],
  },
  exmachina: {
    abilityMods: {},
    passiveEffects: [],
  },
  dragonet: {
    abilityMods: {},
    passiveEffects: [],
  },
  arsian: {
    abilityMods: {},
    passiveEffects: [],
  },
  dominion: {
    abilityMods: {},
    passiveEffects: [{ type: "darkvision" }], // 《다크비전》
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
    initialMp: 10,
    mpGrowth: 4,
    abilityMods: { str: 1, dex: 1, agi: 1 },
    checkAbilities: ["str", "dex"]
  },
  acolyte: {
    initialHp: 11,
    hpGrowth: 5,
    initialMp: 12,
    mpGrowth: 6,
    abilityMods: { dex: 1, int: 1, men: 1 },
    checkAbilities: ["dex", "men"]
  },
  mage: {
    initialHp: 10,
    hpGrowth: 4,
    initialMp: 13,
    mpGrowth: 7,
    abilityMods: { int: 1, sen: 1, men: 1 },
    checkAbilities: ["int", "sen"]
  },
  thief: {
    initialHp: 12,
    hpGrowth: 6,
    initialMp: 11,
    mpGrowth: 5,
    abilityMods: { dex: 1, agi: 1, sen: 1 },
    checkAbilities: ["dex", "sen"]
  },
  gunslinger: {
    initialHp: 12,
    hpGrowth: 0,
    initialMp: 11,
    mpGrowth: 0,
    abilityMods: { dex: 1, sen: 1, men: 1 }
  },
  ninja: {
    initialHp: 10,
    hpGrowth: 0,
    initialMp: 13,
    mpGrowth: 0,
    abilityMods: { dex: 1, agi: 1, int: 1 }
  },
  dancer: {
    initialHp: 11,
    hpGrowth: 0,
    initialMp: 12,
    mpGrowth: 0,
    abilityMods: { agi: 1, men: 1, luk: 1 }
  },
  ranger: {
    initialHp: 12,
    hpGrowth: 0,
    initialMp: 11,
    mpGrowth: 0,
    abilityMods: { str: 1, dex: 1, sen: 1 }
  },
  monk: {
    initialHp: 12,
    hpGrowth: 0,
    initialMp: 11,
    mpGrowth: 0,
    abilityMods: { str: 1, agi: 1, men: 1 }
  },
  bard: {
    initialHp: 10,
    hpGrowth: 0,
    initialMp: 13,
    mpGrowth: 0,
    abilityMods: { sen: 1, men: 1, luk: 1 }
  },
  samurai: {
    initialHp: 12,
    hpGrowth: 0,
    initialMp: 11,
    mpGrowth: 0,
    abilityMods: { str: 1, dex: 1, men: 1 }
  },
  summoner: {
    initialHp: 8,
    hpGrowth: 0,
    initialMp: 15,
    mpGrowth: 0,
    abilityMods: { int: 1, men: 1, luk: 1 }
  },
  sage: {
    initialHp: 9,
    hpGrowth: 0,
    initialMp: 14,
    mpGrowth: 0,
    abilityMods: { int: 1, sen: 1, luk: 1 }
  },
  alchemist: {
    initialHp: 10,
    hpGrowth: 0,
    initialMp: 13,
    mpGrowth: 0,
    abilityMods: { dex: 1, int: 1, sen: 1 }
  },
};

/**
 * Elemental attributes for Arianrhod RPG 2E
 * 6 core elements + Null (notation only)
 * Opposing pairs: Fire↔Water, Wind↔Earth, Light↔Dark
 */
ARIANRHOD.elements = {
  none: "ARIANRHOD.ElementNone",
  fire: "ARIANRHOD.ElementFire",
  water: "ARIANRHOD.ElementWater",
  wind: "ARIANRHOD.ElementWind",
  earth: "ARIANRHOD.ElementEarth",
  light: "ARIANRHOD.ElementLight",
  dark: "ARIANRHOD.ElementDark",
};

/**
 * Element opposing pairs mapping.
 * Used for magic defense calculation:
 *   Same element → magDef × 2 (reinforced)
 *   Opposing element → magDef × 0 (negated)
 *   No match (null) → magDef × 1 (normal)
 */
ARIANRHOD.elementOpposites = {
  fire: "water",
  water: "fire",
  wind: "earth",
  earth: "wind",
  light: "dark",
  dark: "light",
};

/**
 * Skill range translations (Japanese → i18n key)
 * Based on Arianrhod 2E Rulebook (p.753-758)
 */
ARIANRHOD.rangeMap = {
  "自身": "ARIANRHOD.RangeSelf",
  "武器": "ARIANRHOD.RangeWeapon",
  "至近": "ARIANRHOD.RangeClose",
  "効果参照": "ARIANRHOD.RangeSeeEffect",
  "視界": "ARIANRHOD.RangeLineOfSight",
  "10m": "ARIANRHOD.Range10m",
  "20m": "ARIANRHOD.Range20m",
};

/**
 * Skill target translations (Japanese → i18n key)
 * Based on Arianrhod 2E Rulebook (p.739-749)
 */
ARIANRHOD.targetMap = {
  "自身": "ARIANRHOD.TargetSelf",
  "単体": "ARIANRHOD.TargetSingle",
  "範囲": "ARIANRHOD.TargetArea",
  "効果参照": "ARIANRHOD.TargetSeeEffect",
  "範囲（選択）": "ARIANRHOD.TargetAreaSelect",
  "SL体": "ARIANRHOD.TargetSLCount",
  "[SL+1]体": "ARIANRHOD.TargetSLPlus1Count",
};

/**
 * Skill Library - imported from dedicated module
 * Contains all available skills from the Arianrhod 2E Rulebook (pp.89-149)
 */
ARIANRHOD.skillLibrary = skillLibrary;

/**
 * Equipment Library - imported from dedicated module
 * Contains all standard equipment from the Arianrhod 2E Rulebook
 */
ARIANRHOD.equipmentLibrary = equipmentLibrary;

/**
 * Guild Support Library - imported from dedicated module
 * Contains all guild supports from the Arianrhod 2E Rulebook (pp.189-196)
 */
ARIANRHOD.guildSupports = guildSupports;

/**
 * Trap structure types
 */
ARIANRHOD.trapStructures = {
  physical: "ARIANRHOD.TrapPhysical",
  magical: "ARIANRHOD.TrapMagical",
};

/**
 * Trap condition types (trigger mechanism)
 */
ARIANRHOD.trapConditions = {
  trigger: "ARIANRHOD.TrapTrigger",
  enchant: "ARIANRHOD.TrapEnchant",
  continue: "ARIANRHOD.TrapContinue",
};

/**
 * Class restriction options for equipment
 */
/**
 * Enemy Skill Library - imported from dedicated module
 * Contains all common enemy skills from the Arianrhod 2E Rulebook (pp.299-305)
 */
ARIANRHOD.enemySkillLibrary = enemySkillLibrary;

/**
 * Class restriction options for equipment
 */
/**
 * Connection relationship types (D66 table, p.369)
 * Pairs: 11-12, 13-14, 15-16, 21-22, ... mapped to keys.
 */
ARIANRHOD.connectionRelations = {
  liege: "ARIANRHOD.RelationLiege",
  friend: "ARIANRHOD.RelationFriend",
  comrade: "ARIANRHOD.RelationComrade",
  admiration: "ARIANRHOD.RelationAdmiration",
  debt: "ARIANRHOD.RelationDebt",
  transaction: "ARIANRHOD.RelationTransaction",
  trust: "ARIANRHOD.RelationTrust",
  protection: "ARIANRHOD.RelationProtection",
  companion: "ARIANRHOD.RelationCompanion",
  enmity: "ARIANRHOD.RelationEnmity",
  kinship: "ARIANRHOD.RelationKinship",
  patron: "ARIANRHOD.RelationPatron",
  benefactor: "ARIANRHOD.RelationBenefactor",
  dejavu: "ARIANRHOD.RelationDejavu",
  gratitude: "ARIANRHOD.RelationGratitude",
  rival: "ARIANRHOD.RelationRival",
  guardian: "ARIANRHOD.RelationGuardian",
  yearning: "ARIANRHOD.RelationYearning",
};

/**
 * D66 → relation key mapping.
 * Each pair of D66 values maps to a relation key.
 */
ARIANRHOD.connectionD66Table = {
  11: "liege", 12: "liege",
  13: "friend", 14: "friend",
  15: "comrade", 16: "comrade",
  21: "admiration", 22: "admiration",
  23: "debt", 24: "debt",
  25: "transaction", 26: "transaction",
  31: "trust", 32: "trust",
  33: "protection", 34: "protection",
  35: "companion", 36: "companion",
  41: "enmity", 42: "enmity",
  43: "kinship", 44: "kinship",
  45: "patron", 46: "patron",
  51: "benefactor", 52: "benefactor",
  53: "dejavu", 54: "dejavu",
  55: "gratitude", 56: "gratitude",
  61: "rival", 62: "rival",
  63: "guardian", 64: "guardian",
  65: "yearning", 66: "yearning",
};

/**
 * Brightness levels (p.239)
 * 1 = total darkness, 4 = full daylight
 */
ARIANRHOD.brightnessLevels = {
  1: "ARIANRHOD.Brightness1",
  2: "ARIANRHOD.Brightness2",
  3: "ARIANRHOD.Brightness3",
  4: "ARIANRHOD.Brightness4",
};

/**
 * Object presets for dungeon objects (Rulebook p.361-364)
 */
ARIANRHOD.objectPresets = {
  door: { nameKey: "ARIANRHOD.ObjectTypeDoor", hp: 20, physDef: 5, magDef: 5 },
  bridge: { nameKey: "ARIANRHOD.ObjectTypeBridge", hp: 40, physDef: 5, magDef: 5 },
  barricade: { nameKey: "ARIANRHOD.ObjectTypeBarricade", hp: 30, physDef: 10, magDef: 10 },
  chest: { nameKey: "ARIANRHOD.ObjectTypeChest", hp: 20, physDef: 10, magDef: 10 },
  fountain: { nameKey: "ARIANRHOD.ObjectTypeFountain", hp: 0, physDef: 0, magDef: 0, uses: 3, specialEffect: "HP [2D] recovery" },
  generic: { nameKey: "ARIANRHOD.ObjectTypeGeneric", hp: 10, physDef: 5, magDef: 5 },
};

/**
 * Object type options
 */
ARIANRHOD.objectTypes = {
  door: "ARIANRHOD.ObjectTypeDoor",
  bridge: "ARIANRHOD.ObjectTypeBridge",
  barricade: "ARIANRHOD.ObjectTypeBarricade",
  chest: "ARIANRHOD.ObjectTypeChest",
  fountain: "ARIANRHOD.ObjectTypeFountain",
  generic: "ARIANRHOD.ObjectTypeGeneric",
};

ARIANRHOD.classRestrictions = {
  "": "ARIANRHOD.NoRestriction",
  W: "ARIANRHOD.ClassWarrior",
  A: "ARIANRHOD.ClassAcolyte",
  M: "ARIANRHOD.ClassMage",
  T: "ARIANRHOD.ClassThief",
  WA: "ARIANRHOD.RestrictionWA",
  WM: "ARIANRHOD.RestrictionWM",
  WT: "ARIANRHOD.RestrictionWT",
  AM: "ARIANRHOD.RestrictionAM",
  AT: "ARIANRHOD.RestrictionAT",
  MT: "ARIANRHOD.RestrictionMT",
  WAM: "ARIANRHOD.RestrictionWAM",
  WAT: "ARIANRHOD.RestrictionWAT",
  WMT: "ARIANRHOD.RestrictionWMT",
  AMT: "ARIANRHOD.RestrictionAMT",
};
