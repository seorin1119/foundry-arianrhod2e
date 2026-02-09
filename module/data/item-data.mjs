const { SchemaField, NumberField, StringField, HTMLField, BooleanField } = foundry.data.fields;

/**
 * Data model for Weapon items.
 */
export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      weaponType: new StringField({ initial: "" }),
      accuracy: new NumberField({ required: true, integer: true, initial: 0 }),
      attack: new NumberField({ required: true, integer: true, initial: 0 }),
      range: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      weight: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      equipped: new BooleanField({ initial: false }),
      slot: new StringField({ initial: "right" }),
    };
  }
}

/**
 * Data model for Armor items.
 */
export class ArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      armorType: new StringField({ initial: "" }),
      physDef: new NumberField({ required: true, integer: true, initial: 0 }),
      magDef: new NumberField({ required: true, integer: true, initial: 0 }),
      evasion: new NumberField({ required: true, integer: true, initial: 0 }),
      weight: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      equipped: new BooleanField({ initial: false }),
      slot: new StringField({ initial: "body" }),
    };
  }
}

/**
 * Data model for Accessory items.
 */
export class AccessoryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      effect: new StringField({ initial: "" }),
      weight: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      equipped: new BooleanField({ initial: false }),
      slot: new StringField({ initial: "accessory1" }),
    };
  }
}

/**
 * Data model for Skill items.
 */
export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      skillClass: new StringField({ initial: "" }),
      level: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      maxLevel: new NumberField({ required: true, integer: true, min: 1, initial: 5 }),
      timing: new StringField({ initial: "" }),
      target: new StringField({ initial: "" }),
      range: new StringField({ initial: "" }),
      cost: new StringField({ initial: "" }),
      effect: new StringField({ initial: "" }),
    };
  }
}

/**
 * Data model for general Item items.
 */
export class ItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      itemType: new StringField({ initial: "" }),
      weight: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      quantity: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      effect: new StringField({ initial: "" }),
    };
  }
}
