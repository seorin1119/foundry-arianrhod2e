/**
 * Extend the base Item document for Arianrhod RPG 2E.
 * @extends {Item}
 */
export class ArianrhodItem extends Item {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /**
   * Post the item's description to chat.
   * @returns {Promise<ChatMessage>}
   */
  async postToChat() {
    const systemData = this.system;
    let content = `<div class="arianrhod item-chat">`;
    content += `<h3>${this.name}</h3>`;

    if (this.type === "skill") {
      if (systemData.timing) {
        content += `<p><strong>${game.i18n.localize("ARIANRHOD.Timing")}:</strong> ${systemData.timing}</p>`;
      }
      if (systemData.target) {
        content += `<p><strong>${game.i18n.localize("ARIANRHOD.Target")}:</strong> ${systemData.target}</p>`;
      }
      if (systemData.range) {
        content += `<p><strong>${game.i18n.localize("ARIANRHOD.Range")}:</strong> ${systemData.range}</p>`;
      }
      if (systemData.cost) {
        content += `<p><strong>${game.i18n.localize("ARIANRHOD.Cost")}:</strong> ${systemData.cost}</p>`;
      }
      if (systemData.effect) {
        content += `<p><strong>${game.i18n.localize("ARIANRHOD.Effect")}:</strong> ${systemData.effect}</p>`;
      }
    }

    if (systemData.description) {
      content += `<div class="item-description">${systemData.description}</div>`;
    }

    content += `</div>`;

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
    });
  }
}
