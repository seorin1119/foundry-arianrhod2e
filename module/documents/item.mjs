/**
 * Extend the base Item document for Arianrhod RPG 2E.
 * @extends {Item}
 */
export class ArianrhodItem extends Item {

  static ITEM_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/item-card.hbs";

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
}
