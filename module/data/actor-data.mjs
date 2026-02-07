const { SchemaField, NumberField, StringField, HTMLField, BooleanField } = foundry.data.fields;

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
      abilities: new SchemaField({
        str: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        dex: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        agi: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        int: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        per: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        spi: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
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
      fate: new SchemaField({
        value: new NumberField({ required: true, integer: true, min: 0, initial: 3 }),
        max: new NumberField({ required: true, integer: true, min: 0, initial: 3 }),
      }),
      currency: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
    };
  }

  /** @override */
  prepareDerivedData() {
    // Calculate ability bonuses (能力ボーナス = floor(能力基本値 / 3))
    for (const ability of Object.values(this.abilities)) {
      ability.bonus = Math.floor(ability.value / 3);
    }
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
        per: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
        spi: new SchemaField({ value: new NumberField({ required: true, integer: true, min: 0, initial: 6 }) }),
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
