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
      element: new StringField({ initial: "none" }),
      appraisalDC: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      classRestriction: new StringField({ initial: "" }),
      isMagical: new BooleanField({ initial: false }),
      mpCost: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
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
      initiativeMod: new NumberField({ required: true, integer: true, initial: 0 }),
      movementMod: new NumberField({ required: true, integer: true, initial: 0 }),
      weight: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      appraisalDC: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      classRestriction: new StringField({ initial: "" }),
      isMagical: new BooleanField({ initial: false }),
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
      physDef: new NumberField({ required: true, integer: true, initial: 0 }),
      magDef: new NumberField({ required: true, integer: true, initial: 0 }),
      evasion: new NumberField({ required: true, integer: true, initial: 0 }),
      initiativeMod: new NumberField({ required: true, integer: true, initial: 0 }),
      movementMod: new NumberField({ required: true, integer: true, initial: 0 }),
      weight: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      price: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      appraisalDC: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      classRestriction: new StringField({ initial: "" }),
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
      element: new StringField({ initial: "none" }),
      effect: new StringField({ initial: "" }),

      // Structured effect data for auto-application
      structuredEffect: new SchemaField({
        type: new StringField({ initial: "" }),            // buff, debuff, heal, damage, status, removeStatus, ""
        stat: new StringField({ initial: "" }),             // accuracy, evasion, physDef, magDef, attack, initiative, movement
        value: new NumberField({ integer: true, initial: 0 }),
        resource: new StringField({ initial: "hp" }),       // hp or mp (for heal)
        statusId: new StringField({ initial: "" }),         // status effect id (for status type)
        statusValue: new NumberField({ integer: true, initial: 0 }), // magnitude for poison(n), knockback(n)
        element: new StringField({ initial: "none" }),
        duration: new StringField({ initial: "instant" }),  // instant, round, 3rounds, scene, combat
      }, { required: false }),
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
      consumable: new BooleanField({ initial: false }),
      effect: new StringField({ initial: "" }),
    };
  }
}

/**
 * Data model for Trap items (GM tool).
 * Covers trigger, enchant, and continue-type traps.
 */
export class TrapData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new HTMLField(),
      trapLevel: new NumberField({ required: true, integer: true, min: 1, initial: 1 }),
      structure: new StringField({ initial: "physical" }),
      conditionType: new StringField({ initial: "trigger" }),
      detectionDC: new NumberField({ required: true, integer: true, min: 0, initial: 12 }),
      disarmDC: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
      resistCheck: new StringField({ initial: "" }),
      resistDC: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      target: new StringField({ initial: "single" }),
      range: new StringField({ initial: "close" }),
      element: new StringField({ initial: "none" }),
      damage: new StringField({ initial: "" }),
      effect: new StringField({ initial: "" }),
    };
  }
}
