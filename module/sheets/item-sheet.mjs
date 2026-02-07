/**
 * Item sheet for Arianrhod RPG 2E items.
 * @extends {ItemSheet}
 */
export class ArianrhodItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arianrhod2e", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/arianrhod2e/templates/item/item-${this.item.type}-sheet.hbs`;
  }

  /** @override */
  async getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);

    context.system = itemData.system;
    context.flags = itemData.flags;
    context.config = CONFIG.ARIANRHOD;

    // Enrich description
    context.enrichedDescription = await TextEditor.enrichHTML(
      context.system.description,
      { async: true }
    );

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // Post to chat
    html.find(".item-post").click(async () => {
      await this.item.postToChat();
    });
  }
}
