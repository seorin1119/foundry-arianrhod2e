import { getWeaponIcon, getArmorIcon, getItemIcon, getSkillIcon, ACCESSORY_ICONS } from "../helpers/icon-mapping.mjs";

/**
 * Extend the base Item document for Arianrhod RPG 2E.
 * @extends {Item}
 */
export class ArianrhodItem extends Item {

  static ITEM_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/item-card.hbs";

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    // Set default icon based on item type if using default Foundry icon
    if (!data.img || data.img === "icons/svg/item-bag.svg") {
      let icon;
      switch (data.type) {
        case "weapon": icon = getWeaponIcon(data.system?.weaponType); break;
        case "armor": icon = getArmorIcon(data.system?.armorType); break;
        case "accessory": icon = ACCESSORY_ICONS.default; break;
        case "skill": icon = getSkillIcon(data.system?.timing); break;
        case "item": icon = getItemIcon(data.system?.itemType); break;
        case "trap": icon = "icons/svg/trap.svg"; break;
      }
      if (icon) this.updateSource({ img: icon });
    }
  }

  /**
   * Post the item's description to chat as a rich card.
   * @returns {Promise<ChatMessage>}
   */
  async postToChat() {
    const systemData = this.system;
    const stats = [];
    const typeLabels = {
      weapon: "ARIANRHOD.Weapon",
      armor: "ARIANRHOD.Armor",
      accessory: "ARIANRHOD.Accessory",
      skill: "ARIANRHOD.Skill",
      item: "ARIANRHOD.Item",
      trap: "ARIANRHOD.Trap",
    };

    // Build stats array based on item type
    if (this.type === "weapon") {
      stats.push(
        { label: game.i18n.localize("ARIANRHOD.Accuracy"), value: systemData.accuracy ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Attack"), value: systemData.attack ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Weight"), value: systemData.weight ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Price"), value: `${systemData.price ?? 0}G` },
      );
      if (systemData.element && systemData.element !== "none") {
        stats.push({ label: game.i18n.localize("ARIANRHOD.Element"), value: game.i18n.localize(CONFIG.ARIANRHOD.elements[systemData.element]) });
      }
    } else if (this.type === "armor") {
      stats.push(
        { label: game.i18n.localize("ARIANRHOD.PhysDef"), value: systemData.physDef ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.MagDef"), value: systemData.magDef ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Evasion"), value: systemData.evasion ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Weight"), value: systemData.weight ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Price"), value: `${systemData.price ?? 0}G` },
      );
    } else if (this.type === "accessory") {
      if (systemData.physDef) stats.push({ label: game.i18n.localize("ARIANRHOD.PhysDef"), value: systemData.physDef });
      if (systemData.magDef) stats.push({ label: game.i18n.localize("ARIANRHOD.MagDef"), value: systemData.magDef });
      stats.push(
        { label: game.i18n.localize("ARIANRHOD.Weight"), value: systemData.weight ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Price"), value: `${systemData.price ?? 0}G` },
      );
    } else if (this.type === "skill") {
      if (systemData.timing) {
        const timingLabel = game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[systemData.timing] ?? systemData.timing);
        stats.push({ label: game.i18n.localize("ARIANRHOD.Timing"), value: timingLabel });
      }
      if (systemData.target) stats.push({ label: game.i18n.localize("ARIANRHOD.Target"), value: systemData.target });
      if (systemData.range) stats.push({ label: game.i18n.localize("ARIANRHOD.Range"), value: systemData.range });
      if (systemData.cost) stats.push({ label: game.i18n.localize("ARIANRHOD.Cost"), value: systemData.cost });
    } else if (this.type === "item") {
      stats.push(
        { label: game.i18n.localize("ARIANRHOD.Weight"), value: systemData.weight ?? 0 },
        { label: game.i18n.localize("ARIANRHOD.Price"), value: `${systemData.price ?? 0}G` },
      );
      if (systemData.quantity > 1) stats.push({ label: game.i18n.localize("ARIANRHOD.Quantity"), value: systemData.quantity });
    }

    const content = await renderTemplate(ArianrhodItem.ITEM_CARD_TEMPLATE, {
      itemName: this.name,
      itemImg: this.img || "icons/svg/item-bag.svg",
      itemType: this.type,
      typeLabel: game.i18n.localize(typeLabels[this.type] ?? "ARIANRHOD.Item"),
      hasStats: stats.length > 0,
      stats,
      effect: systemData.effect ?? "",
      description: systemData.description ?? "",
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
    });
  }

  /**
   * Use a consumable item, applying its effect and reducing quantity.
   * @returns {Promise<{recovered: number, newQty: number}|null>}
   */
  async use() {
    if (this.type !== "item" || !this.system.consumable) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoConsumableItems"));
      return null;
    }
    if (this.system.quantity <= 0) return null;

    const actor = this.actor;
    if (!actor) return null;

    const useEffect = this.system.useEffect;
    let recoveryText = "";
    let recoveryClass = "";
    let recovered = 0;

    if (useEffect?.resource && (useEffect.dice > 0 || useEffect.flat > 0)) {
      // Roll recovery
      let formula = "";
      if (useEffect.dice > 0) formula = `${useEffect.dice}d6`;
      if (useEffect.flat > 0) formula = formula ? `${formula} + ${useEffect.flat}` : `${useEffect.flat}`;

      const roll = new Roll(formula);
      await roll.evaluate();
      recovered = roll.total;

      const resource = useEffect.resource; // "hp" or "mp"
      const current = actor.system.combat?.[resource];
      if (current) {
        const newVal = Math.min(current.max, current.value + recovered);
        const actualRecovery = newVal - current.value;
        const updateOpts = resource === "hp" ? { arianrhod2e: { incapacitationRecovery: true } } : {};
        await actor.update({ [`system.combat.${resource}.value`]: newVal }, updateOpts);
        recoveryText = `${resource.toUpperCase()} +${actualRecovery} (${formula}: ${roll.total})`;
        recoveryClass = resource === "hp" ? "ar-hp-recover" : "ar-mp-recover";
      }
    }

    // Decrease quantity
    const newQty = this.system.quantity - 1;
    if (newQty <= 0) {
      await this.delete();
    } else {
      await this.update({ "system.quantity": newQty });
    }

    // Post chat card
    const content = await renderTemplate("systems/arianrhod2e/templates/chat/item-use-card.hbs", {
      itemImg: this.img || "icons/svg/item-bag.svg",
      itemName: this.name,
      hasEffect: !!this.system.effect,
      effectText: this.system.effect || "",
      hasRecovery: !!recoveryText,
      recoveryText,
      recoveryClass,
      remainingQty: newQty > 0 ? newQty : null,
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
    });

    return { recovered, newQty };
  }

  /**
   * Resolve a trap, posting its details to chat.
   * @returns {Promise<void>}
   */
  async resolve() {
    if (this.type !== "trap") return null;

    const structureLabels = {
      physical: game.i18n.localize("ARIANRHOD.TrapPhysical"),
      magical: game.i18n.localize("ARIANRHOD.TrapMagical"),
    };

    const content = await renderTemplate("systems/arianrhod2e/templates/chat/trap-card.hbs", {
      trapImg: this.img || "icons/svg/trap.svg",
      trapName: this.name,
      trapLevel: this.system.trapLevel ?? 1,
      structureLabel: structureLabels[this.system.structure] || this.system.structure,
      detectionDC: this.system.detectionDC ?? 0,
      disarmDC: this.system.disarmDC ?? 0,
      damage: this.system.damage || "",
      effect: this.system.effect || "",
      trapId: this.id,
    });

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      content,
    });
  }
}
