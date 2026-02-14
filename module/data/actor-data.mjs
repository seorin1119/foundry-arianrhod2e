const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = foundry.data.fields;

/**
 * Data model for Arianrhod RPG 2E Character actors.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      biography: new HTMLField(),
      race: new StringField({ initial: "" }),
      age: new StringField({ initial: "" }),
      gender: new StringField({ initial: "" }),
      mainClass: new StringField({ initial: "" }),
      supportClass: new StringField({ initial: "" }),
      level: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      experience: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      guild: new StringField({ initial: "" }),
      growthPoints: new SchemaField({
        total: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        spent: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      }),
      lifePath: new SchemaField({
        origin: new StringField({ initial: "" }),
        originCustom: new StringField({ initial: "" }),
        circumstance: new StringField({ initial: "" }),
        circumstanceCustom: new StringField({ initial: "" }),
        objective: new StringField({ initial: "" }),
        objectiveCustom: new StringField({ initial: "" }),
      }),
      abilities: new SchemaField({
        str: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        dex: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        agi: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        int: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        sen: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        men: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        luk: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
      }),
      combat: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
          max: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        }),
        mp: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
          max: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
        }),
        physDef: new NumberField({ required: true, integer: true, initial: 0 }),
        magDef: new NumberField({ required: true, integer: true, initial: 0 }),
        initiative: new NumberField({ required: true, integer: true, initial: 0 }),
        movement: new NumberField({ required: true, integer: true, initial: 7 }),
        accuracy: new NumberField({ required: true, integer: true, initial: 0 }),
        evasion: new NumberField({ required: true, integer: true, initial: 0 }),
        attack: new NumberField({ required: true, integer: true, initial: 0 }),
        magAttack: new NumberField({ required: true, integer: true, initial: 0 }),
      }),
      specialChecks: new SchemaField({
        alchemy: new NumberField({ required: true, integer: true, initial: 0 }),
        trapDisarm: new NumberField({ required: true, integer: true, initial: 0 }),
        trapDetect: new NumberField({ required: true, integer: true, initial: 0 }),
        dangerSense: new NumberField({ required: true, integer: true, initial: 0 }),
        magicCheck: new NumberField({ required: true, integer: true, initial: 0 }),
        enemyIdentify: new NumberField({ required: true, integer: true, initial: 0 }),
        itemAppraise: new NumberField({ required: true, integer: true, initial: 0 }),
      }),
      fate: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 3 }),
      }),
      currency: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      carryCapacity: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      }),
      connections: new ArrayField(new SchemaField({
        name: new StringField({ initial: "" }),
        relation: new StringField({ initial: "" }),
        place: new StringField({ initial: "" }),
        info: new StringField({ initial: "" }),
      })),
      growthLog: new ArrayField(new SchemaField({
        level: new NumberField({ integer: true, initial: 1 }),
        abilities: new StringField({ initial: "" }),
        skills: new StringField({ initial: "" }),
        growthPts: new NumberField({ integer: true, initial: 0 }),
        gold: new NumberField({ integer: true, initial: 0 }),
        notes: new StringField({ initial: "" }),
      })),
    };
  }

  /** @override */
  prepareDerivedData() {
    // Calculate total growth points from level
    // In Arianrhod 2E, characters get 2 growth points per level after level 1
    this.growthPoints.total = (this.level - 1) * 2;
    this.growthPoints.remaining = this.growthPoints.total - this.growthPoints.spent;

    // Apply race and class ability modifiers
    const raceData = CONFIG.ARIANRHOD.raceData?.[this.race];
    const mainClassData = CONFIG.ARIANRHOD.classData?.[this.mainClass];
    const supportClassData = CONFIG.ARIANRHOD.classData?.[this.supportClass];

    for (const [abilityKey, ability] of Object.entries(this.abilities)) {
      // Get race modifier for this ability (default to 0)
      const raceMod = raceData?.abilityMods?.[abilityKey] || 0;

      // Get class modifiers for this ability (default to 0)
      const mainClassMod = mainClassData?.abilityMods?.[abilityKey] || 0;
      const supportClassMod = supportClassData?.abilityMods?.[abilityKey] || 0;

      // Calculate total modifier from all sources
      ability.mod = raceMod + mainClassMod + supportClassMod;
      ability.total = ability.value + ability.mod;

      // Race base value (기본치 = 종족 기본치, before class modifiers)
      ability.base = ability.value + raceMod;

      // Calculate ability bonuses (能力ボーナス = floor(能力基本値 / 3))
      // Use total value (including all modifiers) for bonus calculation
      ability.bonus = Math.floor(ability.total / 3);
    }

    // Calculate class-based HP/MP maximums
    if (mainClassData && supportClassData) {
      // Formula from Arianrhod 2E Rulebook p.62:
      // Max HP = STR base (기본치) + Main initialHP + Support initialHP + Main hpGrowth × (level - 1)
      // Max MP = MEN base (기본치) + Main initialMP + Support initialMP + Main mpGrowth × (level - 1)
      // 기본치 = race base value (ability.value + raceMod, before class modifiers)
      const calculatedMaxHp = this.abilities.str.base
        + mainClassData.initialHp
        + supportClassData.initialHp
        + mainClassData.hpGrowth * (this.level - 1);

      const calculatedMaxMp = this.abilities.men.base
        + mainClassData.initialMp
        + supportClassData.initialMp
        + mainClassData.mpGrowth * (this.level - 1);

      this.combat.hp.max = calculatedMaxHp;
      this.combat.mp.max = calculatedMaxMp;
    }
    // If either class is missing/invalid, skip calculation (preserve manual values)

    // Set race-specific fate max
    const raceFateMax = this.race === "huulin" ? 6 : 5;
    this.fate.max = raceFateMax;

    // Clamp current values to max
    this.combat.hp.value = Math.min(this.combat.hp.value, this.combat.hp.max);
    this.combat.mp.value = Math.min(this.combat.mp.value, this.combat.mp.max);
    this.fate.value = Math.min(this.fate.value, this.fate.max);
  }
}

/**
 * Data model for Arianrhod RPG 2E Enemy actors.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class EnemyData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      enemyType: new StringField({ initial: "" }),
      level: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      abilities: new SchemaField({
        str: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        dex: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        agi: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        int: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        sen: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        men: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        luk: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
      }),
      combat: new SchemaField({
        hp: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
          max: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
        }),
        mp: new SchemaField({
          value: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
          max: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
        }),
        physDef: new NumberField({ required: true, integer: true, initial: 0 }),
        magDef: new NumberField({ required: true, integer: true, initial: 0 }),
        initiative: new NumberField({ required: true, integer: true, initial: 0 }),
        movement: new NumberField({ required: true, integer: true, initial: 2 }),
        accuracy: new NumberField({ required: true, integer: true, initial: 0 }),
        evasion: new NumberField({ required: true, integer: true, initial: 0 }),
        attack: new NumberField({ required: true, integer: true, initial: 0 }),
        magAttack: new NumberField({ required: true, integer: true, initial: 0 }),
      }),
      drops: new StringField({ initial: "" }),
      exp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    };
  }

  /** @override */
  prepareDerivedData() {
    for (const ability of Object.values(this.abilities)) {
      ability.bonus = Math.floor(ability.value / 3);
    }
    this.combat.hp.value = Math.min(this.combat.hp.value, this.combat.hp.max);
    this.combat.mp.value = Math.min(this.combat.mp.value, this.combat.mp.max);
  }
}
