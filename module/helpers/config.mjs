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
    initialMp: 10,
    mpGrowth: 4,
    abilityMods: { str: 1, dex: 1, agi: 1 }
  },
  acolyte: {
    initialHp: 11,
    hpGrowth: 5,
    initialMp: 12,
    mpGrowth: 6,
    abilityMods: { dex: 1, int: 1, men: 1 }
  },
  mage: {
    initialHp: 10,
    hpGrowth: 4,
    initialMp: 13,
    mpGrowth: 7,
    abilityMods: { int: 1, sen: 1, men: 1 }
  },
  thief: {
    initialHp: 12,
    hpGrowth: 6,
    initialMp: 11,
    mpGrowth: 5,
    abilityMods: { dex: 1, agi: 1, sen: 1 }
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
 * Skill Library - Contains all available skills from the rulebook
 * Based on Arianrhod 2E Rulebook and RULEBOOK_REFERENCE.md
 * Format: { id, name, class, timing, cost, range, target, maxLevel, description }
 */
ARIANRHOD.skillLibrary = {
  // General Skills (一般スキル) - Available to all classes
  general: [
    {
      id: "opinion",
      name: "オピニオン",
      nameEn: "Opinion",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "社会的な交渉や説得判定にボーナスを得る。"
    },
    {
      id: "history",
      name: "ヒストリー",
      nameEn: "History",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "歴史や伝承に関する知識判定にボーナスを得る。"
    },
    {
      id: "enlarge-limit",
      name: "インラージ・リミット",
      nameEn: "Enlarge Limit",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "所持重量の上限が増加する。"
    },
    {
      id: "remove-trap",
      name: "リムーブ・トラップ",
      nameEn: "Remove Trap",
      skillClass: "general",
      timing: "action",
      cost: "",
      range: "",
      target: "トラップ",
      maxLevel: 5,
      description: "トラップの解除判定にボーナスを得る。"
    },
    {
      id: "destroyer",
      name: "デストロイアー",
      nameEn: "Destroyer",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "物体破壊の判定にボーナスを得る。"
    },
    {
      id: "six-sense",
      name: "シックスセンス",
      nameEn: "Six Sense",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "罠や危機の感知判定にボーナスを得る。"
    },
    {
      id: "mythos-knowledge",
      name: "ミソス・ナレッジ",
      nameEn: "Mythos Knowledge",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "神話や信仰に関する知識判定にボーナスを得る。"
    },
    {
      id: "magic-knowledge",
      name: "マジック・ナレッジ",
      nameEn: "Magic Knowledge",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "魔法に関する知識判定にボーナスを得る。"
    },
    {
      id: "alchemy-knowledge",
      name: "アルケミー・ナレッジ",
      nameEn: "Alchemy Knowledge",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "錬金術に関する知識判定にボーナスを得る。"
    },
    {
      id: "identify",
      name: "アイデンティファイ",
      nameEn: "Identify",
      skillClass: "general",
      timing: "action",
      cost: "",
      range: "",
      target: "アイテム",
      maxLevel: 5,
      description: "アイテムの鑑定判定にボーナスを得る。"
    },
    {
      id: "bluff",
      name: "ブラフ",
      nameEn: "Bluff",
      skillClass: "general",
      timing: "action",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "嘘や欺瞞の判定にボーナスを得る。"
    },
    {
      id: "tracking",
      name: "トラッキング",
      nameEn: "Tracking",
      skillClass: "general",
      timing: "action",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "追跡や痕跡発見の判定にボーナスを得る。"
    },
    {
      id: "insight",
      name: "インサイト",
      nameEn: "Insight",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "洞察や心理判定にボーナスを得る。"
    },
    {
      id: "surge-risk",
      name: "サージ・リスク",
      nameEn: "Surge Risk",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "危険を顧みない行動で有利な効果を得る。"
    },
    {
      id: "street-wise",
      name: "ストリート・ワイズ",
      nameEn: "Street Wise",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "街や裏社会の情報収集判定にボーナスを得る。"
    },
    {
      id: "vigilante",
      name: "ビジランテ",
      nameEn: "Vigilante",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "警戒や見張りの判定にボーナスを得る。"
    },
    {
      id: "resurge",
      name: "リサージ",
      nameEn: "Resurge",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "回復や再起に関する効果を得る。"
    },
    {
      id: "culture-erindle",
      name: "カルチャー:エリンディル西方",
      nameEn: "Culture: Erindle West",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "エリンディル西方の文化や風習に関する知識判定にボーナスを得る。"
    },
    {
      id: "modern-world",
      name: "現代世界",
      nameEn: "Modern World",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "現代世界の知識や技術に関する判定にボーナスを得る。（アーシアン専用）"
    },
    {
      id: "trivialist",
      name: "トリビアリスト",
      nameEn: "Trivialist",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "雑学全般の知識判定にボーナスを得る。"
    },
    {
      id: "gunsmith",
      name: "ガンスミス",
      nameEn: "Gunsmith",
      skillClass: "general",
      timing: "passive",
      cost: "",
      range: "",
      target: "",
      maxLevel: 5,
      description: "銃器の製作や修理判定にボーナスを得る。"
    }
  ],

  // Warrior Skills (ウォーリアー)
  warrior: [
    {
      id: "bash",
      name: "バッシュ",
      nameEn: "Bash",
      skillClass: "warrior",
      timing: "action",
      cost: "3MP",
      range: "武器",
      target: "単体",
      maxLevel: 5,
      description: "白兵攻撃のダメージが増加する。"
    },
    {
      id: "cover",
      name: "カバー",
      nameEn: "Cover",
      skillClass: "warrior",
      timing: "damage",
      cost: "2MP",
      range: "10m",
      target: "単体",
      maxLevel: 3,
      description: "味方が受けたダメージを代わりに受ける。"
    },
    {
      id: "provoke",
      name: "プロヴォーク",
      nameEn: "Provoke",
      skillClass: "warrior",
      timing: "action",
      cost: "3MP",
      range: "10m",
      target: "単体",
      maxLevel: 3,
      description: "敵の注意を自分に引きつける。"
    }
  ],

  // Acolyte Skills (アコライト)
  acolyte: [
    {
      id: "heal",
      name: "ヒール",
      nameEn: "Heal",
      skillClass: "acolyte",
      timing: "action",
      cost: "2MP",
      range: "10m",
      target: "単体",
      maxLevel: 5,
      description: "対象のHPを回復する。"
    },
    {
      id: "bless",
      name: "ブレス",
      nameEn: "Bless",
      skillClass: "acolyte",
      timing: "action",
      cost: "3MP",
      range: "10m",
      target: "単体",
      maxLevel: 5,
      description: "対象の判定にボーナスを与える。"
    },
    {
      id: "purify",
      name: "ピュリファイ",
      nameEn: "Purify",
      skillClass: "acolyte",
      timing: "action",
      cost: "3MP",
      range: "10m",
      target: "単体",
      maxLevel: 3,
      description: "対象のバッドステータスを解除する。"
    }
  ],

  // Mage Skills (メイジ)
  mage: [
    {
      id: "fire-bolt",
      name: "ファイアボルト",
      nameEn: "Fire Bolt",
      skillClass: "mage",
      timing: "action",
      cost: "3MP",
      range: "20m",
      target: "単体",
      maxLevel: 5,
      description: "炎の魔法攻撃を行う。"
    },
    {
      id: "protect",
      name: "プロテクション",
      nameEn: "Protection",
      skillClass: "mage",
      timing: "action",
      cost: "3MP",
      range: "10m",
      target: "単体",
      maxLevel: 5,
      description: "対象の防御力を上昇させる。"
    },
    {
      id: "dispel",
      name: "ディスペル",
      nameEn: "Dispel",
      skillClass: "mage",
      timing: "action",
      cost: "4MP",
      range: "20m",
      target: "単体",
      maxLevel: 3,
      description: "魔法効果を解除する。"
    }
  ],

  // Thief Skills (シーフ)
  thief: [
    {
      id: "surprise-attack",
      name: "サプライズアタック",
      nameEn: "Surprise Attack",
      skillClass: "thief",
      timing: "action",
      cost: "3MP",
      range: "武器",
      target: "単体",
      maxLevel: 5,
      description: "不意打ちで大ダメージを与える。"
    },
    {
      id: "hide",
      name: "ハイド",
      nameEn: "Hide",
      skillClass: "thief",
      timing: "setup",
      cost: "2MP",
      range: "自身",
      target: "自身",
      maxLevel: 3,
      description: "隠密状態になる。"
    },
    {
      id: "trap-detect",
      name: "トラップディテクト",
      nameEn: "Trap Detect",
      skillClass: "thief",
      timing: "action",
      cost: "1MP",
      range: "10m",
      target: "範囲",
      maxLevel: 5,
      description: "罠を発見する。"
    }
  ],

  // Additional class skills (placeholders for other classes)
  // These should be filled in with actual rulebook data
  gunslinger: [],
  ninja: [],
  dancer: [],
  ranger: [],
  monk: [],
  bard: [],
  samurai: [],
  summoner: [],
  sage: [],
  alchemist: []
};
