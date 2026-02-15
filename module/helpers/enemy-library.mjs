/**
 * Enemy Library for Arianrhod 2E
 * Contains enemy data from the Arianrhod 2E Rulebook (pp.305-350)
 *
 * Enemy data structure:
 * - id: Unique kebab-case identifier
 * - name: Japanese name
 * - nameKo: Korean name
 * - nameEn: English name
 * - level: Enemy level
 * - category: "mob" or "solo"
 * - type: Enemy classification (demon, undead, animal, fairy, human, construct, plant, mechanical)
 * - element: Element type (none, fire, water, wind, earth, light, dark)
 * - hp: Hit Points
 * - mp: Magic Points
 * - combat: Combat statistics
 *   - physDef: Physical Defense
 *   - magDef: Magical Defense
 *   - initiative: Initiative value
 *   - movement: Movement speed
 *   - accuracy: Accuracy modifier
 *   - accuracyDice: Number of accuracy dice
 *   - attack: Attack power
 *   - attackDice: Number of attack dice
 *   - evasion: Evasion modifier
 *   - evasionDice: Number of evasion dice
 * - exp: Experience points awarded
 * - drops: Drop table description
 * - skills: Array of skill names (Korean)
 *
 * Enemies with partial: true only have name/level/category/type data.
 */

export const enemyLibrary = [
  // ==========================================
  // Level 1 Mobs
  // ==========================================
  {
    id: "goblin",
    name: "ゴブリン",
    nameKo: "고블린",
    nameEn: "Goblin",
    level: 1,
    category: "mob",
    type: "demon",
    element: "none",
    hp: 28,
    mp: 0,
    combat: {
      physDef: 5,
      magDef: 3,
      initiative: 7,
      movement: 7,
      accuracy: 3,
      accuracyDice: 2,
      attack: 8,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 15,
    drops: "6~8: 부러진 단검(5G) / 9~12: 약초(10G)\u00D73 / 13~: 고블린의 손톱(50G)",
    skills: ["고블린 집단"]
  },
  {
    id: "ghost",
    name: "ゴースト",
    nameKo: "고스트",
    nameEn: "Ghost",
    level: 1,
    category: "mob",
    type: "undead",
    element: "none",
    hp: 24,
    mp: 0,
    combat: {
      physDef: 15,
      magDef: 4,
      initiative: 4,
      movement: 12,
      accuracy: 4,
      accuracyDice: 2,
      attack: 6,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 18,
    drops: "6~8: 부식된 동전(5G) / 9~12: 에테르 결정(20G) / 13~: 고스트의 눈물(80G)",
    skills: ["암시", "속성 공격:암", "저항성:독", "비행 능력", "트랩 무효"]
  },
  {
    id: "killer-bee",
    name: "キラービー",
    nameKo: "킬러 비",
    nameEn: "Killer Bee",
    level: 1,
    category: "mob",
    type: "animal",
    element: "wind",
    hp: 26,
    mp: 0,
    combat: {
      physDef: 4,
      magDef: 4,
      initiative: 5,
      movement: 10,
      accuracy: 3,
      accuracyDice: 2,
      attack: 3,
      attackDice: 3,
      evasion: 5,
      evasionDice: 2
    },
    exp: 15,
    drops: "6~8: 독침(5G) / 9~12: 꿀(15G)\u00D72 / 13~: 왕벌의 날개(60G)",
    skills: ["배드 스테이터스 부여:독(1)", "비행 능력", "조소형"]
  },
  {
    id: "brownie",
    name: "ブラウニー",
    nameKo: "브라우니",
    nameEn: "Brownie",
    level: 1,
    category: "mob",
    type: "fairy",
    element: "none",
    hp: 30,
    mp: 0,
    combat: {
      physDef: 4,
      magDef: 5,
      initiative: 7,
      movement: 9,
      accuracy: 5,
      accuracyDice: 2,
      attack: 5,
      attackDice: 2,
      evasion: 3,
      evasionDice: 2
    },
    exp: 15,
    drops: "6~8: 오래된 프라이팬(5G) / 9~12: 꿀과자(15G)\u00D72 / 13~: 브라우니의 모자(70G)",
    skills: ["도와주기", "지형 적응:정착한 집"]
  },
  {
    id: "needle-fish",
    name: "ニードルフィッシュ",
    nameKo: "니들 피쉬",
    nameEn: "Needle Fish",
    level: 1,
    category: "mob",
    type: "animal",
    element: "water",
    hp: 30,
    mp: 0,
    combat: {
      physDef: 2,
      magDef: 3,
      initiative: 4,
      movement: 8,
      accuracy: 3,
      accuracyDice: 2,
      attack: 6,
      attackDice: 2,
      evasion: 3,
      evasionDice: 2
    },
    exp: 13,
    drops: "6~8: 바늘 이빨(3G) / 9~12: 생선 살(10G)\u00D73 / 13~: 빛나는 비늘(50G)",
    skills: ["물 분사", "수중 행동"]
  },
  {
    id: "clay-golem",
    name: "クレイゴーレム",
    nameKo: "클레이 골렘",
    nameEn: "Clay Golem",
    level: 1,
    category: "mob",
    type: "construct",
    element: "none",
    hp: 30,
    mp: 0,
    combat: {
      physDef: 0,
      magDef: 0,
      initiative: 6,
      movement: 6,
      accuracy: 3,
      accuracyDice: 2,
      attack: 8,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 15,
    drops: "6~8: 진흙 덩어리(3G) / 9~12: 마력석(25G) / 13~: 골렘 코어(100G)",
    skills: ["수복 작업", "범위 공격:백병"]
  },
  {
    id: "pericular",
    name: "ペリキュラー",
    nameKo: "페리큘러",
    nameEn: "Pericular",
    level: 1,
    category: "mob",
    type: "plant",
    element: "none",
    hp: 28,
    mp: 0,
    combat: {
      physDef: 3,
      magDef: 2,
      initiative: 5,
      movement: 8,
      accuracy: 3,
      accuracyDice: 2,
      attack: 3,
      attackDice: 2,
      evasion: 3,
      evasionDice: 2
    },
    exp: 13,
    drops: "6~8: 마른 줄기(3G) / 9~12: 독포자(15G)\u00D72 / 13~: 변이 씨앗(60G)",
    skills: ["바이러스 브레스:독(1)", "저항성:독"]
  },
  {
    id: "sylph",
    name: "シルフ",
    nameKo: "실프",
    nameEn: "Sylph",
    level: 1,
    category: "mob",
    type: "fairy",
    element: "earth",
    hp: 28,
    mp: 0,
    combat: {
      physDef: 3,
      magDef: 8,
      initiative: 9,
      movement: 15,
      accuracy: 4,
      accuracyDice: 2,
      attack: 10,
      attackDice: 2,
      evasion: 3,
      evasionDice: 2
    },
    exp: 18,
    drops: "6~8: 바람의 깃털(5G) / 9~12: 풍속 결정(20G) / 13~: 실프의 날개(100G)",
    skills: ["바람의 장난", "비행 능력", "마술 공격:풍"]
  },
  {
    id: "pomero",
    name: "ポメロ",
    nameKo: "포메로",
    nameEn: "Pomero",
    level: 1,
    category: "mob",
    type: "fairy",
    element: "wind",
    hp: 30,
    mp: 0,
    combat: {
      physDef: 2,
      magDef: 2,
      initiative: 3,
      movement: 10,
      accuracy: 4,
      accuracyDice: 2,
      attack: 6,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 13,
    drops: "6~8: 부드러운 털(3G) / 9~12: 물 열매(10G)\u00D73 / 13~: 포메로의 종자(50G)",
    skills: ["촉감"]
  },

  // ==========================================
  // Level 2 Mobs
  // ==========================================
  {
    id: "guard-pawn",
    name: "ガードポーン",
    nameKo: "가드 폰",
    nameEn: "Guard Pawn",
    level: 2,
    category: "mob",
    type: "construct",
    element: "none",
    hp: 41,
    mp: 0,
    combat: {
      physDef: 10,
      magDef: 2,
      initiative: 6,
      movement: 11,
      accuracy: 5,
      accuracyDice: 2,
      attack: 10,
      attackDice: 3,
      evasion: 3,
      evasionDice: 2
    },
    exp: 30,
    drops: "6~9: 녹슨 부품(10G) / 10~12: 마력석(25G)\u00D72 / 13~: 폰 코어(150G)",
    skills: ["파이널 모드"]
  },
  {
    id: "gillman",
    name: "ギルマン",
    nameKo: "길맨",
    nameEn: "Gillman",
    level: 2,
    category: "mob",
    type: "animal",
    element: "water",
    hp: 39,
    mp: 0,
    combat: {
      physDef: 6,
      magDef: 4,
      initiative: 8,
      movement: 10,
      accuracy: 4,
      accuracyDice: 2,
      attack: 10,
      attackDice: 2,
      evasion: 3,
      evasionDice: 2
    },
    exp: 28,
    drops: "6~9: 물고기 비늘(8G) / 10~12: 해초(15G)\u00D73 / 13~: 길맨의 창(120G)",
    skills: ["집단전 적응", "길맨 영법"]
  },
  {
    id: "wolf",
    name: "ウルフ",
    nameKo: "늑대",
    nameEn: "Wolf",
    level: 2,
    category: "mob",
    type: "animal",
    element: "fire",
    hp: 37,
    mp: 0,
    combat: {
      physDef: 6,
      magDef: 3,
      initiative: 6,
      movement: 13,
      accuracy: 4,
      accuracyDice: 2,
      attack: 9,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 28,
    drops: "6~9: 늑대 이빨(8G) / 10~12: 늑대 가죽(20G) / 13~: 늑대 왕의 송곳니(130G)",
    skills: ["울프 팩", "소환:늑대"]
  },
  {
    id: "bandit",
    name: "山賊",
    nameKo: "산적",
    nameEn: "Bandit",
    level: 2,
    category: "mob",
    type: "human",
    element: "none",
    hp: 35,
    mp: 0,
    combat: {
      physDef: 5,
      magDef: 4,
      initiative: 6,
      movement: 10,
      accuracy: 4,
      accuracyDice: 2,
      attack: 11,
      attackDice: 2,
      evasion: 3,
      evasionDice: 2
    },
    exp: 25,
    drops: "6~9: 도적의 외투(10G) / 10~12: 훔친 금화(30G) / 13~: 산적의 보물(200G)",
    skills: ["우쭐대기"]
  },
  {
    id: "skeleton",
    name: "スケルトン",
    nameKo: "스켈레톤",
    nameEn: "Skeleton",
    level: 2,
    category: "mob",
    type: "undead",
    element: "none",
    hp: 39,
    mp: 0,
    combat: {
      physDef: 4,
      magDef: 0,
      initiative: 7,
      movement: 8,
      accuracy: 4,
      accuracyDice: 2,
      attack: 10,
      attackDice: 2,
      evasion: 5,
      evasionDice: 2
    },
    exp: 28,
    drops: "6~9: 뼈 조각(8G) / 10~12: 구식 검(20G) / 13~: 마골(150G)",
    skills: ["암시", "뼈의 몸"]
  },
  {
    id: "screamer",
    name: "スクリーマー",
    nameKo: "스크리머",
    nameEn: "Screamer",
    level: 2,
    category: "mob",
    type: "plant",
    element: "earth",
    hp: 37,
    mp: 0,
    combat: {
      physDef: 7,
      magDef: 3,
      initiative: 4,
      movement: 8,
      accuracy: 3,
      accuracyDice: 2,
      attack: 8,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 25,
    drops: "6~9: 마른 뿌리(8G) / 10~12: 비명 꽃(20G) / 13~: 스크리머 씨앗(120G)",
    skills: ["단말마"]
  },
  {
    id: "fomorian",
    name: "フォウォール",
    nameKo: "포워르",
    nameEn: "Fomorian",
    level: 2,
    category: "mob",
    type: "demon",
    element: "none",
    hp: 35,
    mp: 0,
    combat: {
      physDef: 7,
      magDef: 4,
      initiative: 7,
      movement: 9,
      accuracy: 5,
      accuracyDice: 2,
      attack: 14,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 30,
    drops: "6~9: 사신의 발톱(10G) / 10~12: 검은 결정(30G) / 13~: 포워르의 뿔(200G)",
    skills: ["이형:긴 팔"]
  },
  {
    id: "dryad",
    name: "ドリアード",
    nameKo: "드라이어드",
    nameEn: "Dryad",
    level: 2,
    category: "mob",
    type: "fairy",
    element: "earth",
    hp: 35,
    mp: 0,
    combat: {
      physDef: 5,
      magDef: 8,
      initiative: 5,
      movement: 12,
      accuracy: 4,
      accuracyDice: 2,
      attack: 10,
      attackDice: 2,
      evasion: 4,
      evasionDice: 2
    },
    exp: 28,
    drops: "6~9: 나무 가지(8G) / 10~12: 세계수의 잎(25G) / 13~: 드라이어드의 꽃(150G)",
    skills: ["꽃의 꿀", "비행 능력", "마술 공격:지"]
  },

  // ==========================================
  // Level 3+ Mobs (partial data)
  // ==========================================
  {
    id: "goblin-pathfinder",
    name: "ゴブリンパスファインダー",
    nameKo: "고블린 패스파인더",
    nameEn: "Goblin Pathfinder",
    level: 3,
    category: "mob",
    type: "demon",
    partial: true
  },
  {
    id: "nixie",
    name: "ニクシー",
    nameKo: "닉시",
    nameEn: "Nixie",
    level: 3,
    category: "mob",
    type: "fairy",
    partial: true
  },
  {
    id: "viper",
    name: "ドクヘビ",
    nameKo: "독사",
    nameEn: "Viper",
    level: 3,
    category: "mob",
    type: "animal",
    partial: true
  },
  {
    id: "guard",
    name: "警備兵",
    nameKo: "경비병",
    nameEn: "Guard",
    level: 3,
    category: "mob",
    type: "human",
    partial: true
  },
  {
    id: "bugbear",
    name: "バグベアー",
    nameKo: "버그베어",
    nameEn: "Bugbear",
    level: 4,
    category: "mob",
    type: "demon",
    partial: true
  },
  {
    id: "skeleton-soldier",
    name: "スケルトンソルジャー",
    nameKo: "스켈레톤 솔저",
    nameEn: "Skeleton Soldier",
    level: 4,
    category: "mob",
    type: "undead",
    partial: true
  },
  {
    id: "zombie",
    name: "ゾンビ",
    nameKo: "좀비",
    nameEn: "Zombie",
    level: 4,
    category: "mob",
    type: "undead",
    partial: true
  },
  {
    id: "mercenary",
    name: "傭兵",
    nameKo: "용병",
    nameEn: "Mercenary",
    level: 5,
    category: "mob",
    type: "human",
    partial: true
  },
  {
    id: "imp",
    name: "インプ",
    nameKo: "임프",
    nameEn: "Imp",
    level: 5,
    category: "mob",
    type: "demon",
    partial: true
  },
  {
    id: "fire-rat",
    name: "ファイアラット",
    nameKo: "파이어 랫",
    nameEn: "Fire Rat",
    level: 6,
    category: "mob",
    type: "animal",
    partial: true
  },
  {
    id: "sorcerer",
    name: "魔術師",
    nameKo: "마술사",
    nameEn: "Sorcerer",
    level: 6,
    category: "mob",
    type: "human",
    partial: true
  },
  {
    id: "elite-soldier",
    name: "精鋭兵",
    nameKo: "정예병",
    nameEn: "Elite Soldier",
    level: 6,
    category: "mob",
    type: "human",
    partial: true
  },
  {
    id: "zombie-wolf",
    name: "ゾンビウルフ",
    nameKo: "좀비 울프",
    nameEn: "Zombie Wolf",
    level: 6,
    category: "mob",
    type: "undead",
    partial: true
  },
  {
    id: "kikimora",
    name: "キキモラ",
    nameKo: "키키모라",
    nameEn: "Kikimora",
    level: 6,
    category: "mob",
    type: "fairy",
    partial: true
  },
  {
    id: "troll",
    name: "トロール",
    nameKo: "트롤",
    nameEn: "Troll",
    level: 7,
    category: "mob",
    type: "demon",
    partial: true
  },
  {
    id: "redcap",
    name: "レッドキャップ",
    nameKo: "레드캡",
    nameEn: "Redcap",
    level: 8,
    category: "mob",
    type: "fairy",
    partial: true
  },
  {
    id: "bugbear-runner",
    name: "バグベアーランナー",
    nameKo: "버그베어 러너",
    nameEn: "Bugbear Runner",
    level: 8,
    category: "mob",
    type: "demon",
    partial: true
  },
  {
    id: "blueman",
    name: "ブルーマン",
    nameKo: "블루맨",
    nameEn: "Blueman",
    level: 8,
    category: "mob",
    type: "undead",
    partial: true
  },
  {
    id: "iron-eater",
    name: "アイアンイーター",
    nameKo: "아이언 이터",
    nameEn: "Iron Eater",
    level: 8,
    category: "mob",
    type: "construct",
    partial: true
  },
  {
    id: "poison-winder",
    name: "ポイズンワインダー",
    nameKo: "포이즌 와인더",
    nameEn: "Poison Winder",
    level: 8,
    category: "mob",
    type: "plant",
    partial: true
  },
  {
    id: "sand-bug",
    name: "サンドバグ",
    nameKo: "샌드 버그",
    nameEn: "Sand Bug",
    level: 9,
    category: "mob",
    type: "animal",
    partial: true
  },
  {
    id: "security-system",
    name: "セキュリティシステム",
    nameKo: "시큐리티 시스템",
    nameEn: "Security System",
    level: 10,
    category: "mob",
    type: "mechanical",
    partial: true
  },

  // ==========================================
  // Solo Enemies (partial data)
  // ==========================================
  {
    id: "wooden-golem",
    name: "ウドゥンゴーレム",
    nameKo: "우든 골렘",
    nameEn: "Wooden Golem",
    level: 2,
    category: "solo",
    type: "construct",
    partial: true
  },
  {
    id: "goblin-archer",
    name: "ゴブリンアーチャー",
    nameKo: "고블린 아처",
    nameEn: "Goblin Archer",
    level: 3,
    category: "solo",
    type: "demon",
    partial: true
  }
];

/**
 * Get all unique enemy types from the library
 * @returns {string[]}
 */
export function getEnemyTypes() {
  return [...new Set(enemyLibrary.map(e => e.type))];
}

/**
 * Get all unique levels from the library
 * @returns {number[]}
 */
export function getEnemyLevels() {
  return [...new Set(enemyLibrary.map(e => e.level))].sort((a, b) => a - b);
}
