const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Item sheet for Arianrhod RPG 2E items.
 * Uses the v13 ApplicationV2 framework.
 * @extends {ItemSheetV2}
 */
export class ArianrhodItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["arianrhod2e", "sheet", "item"],
    tag: "form",
    position: { width: 520, height: 480 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
    },
    actions: {
      postToChat: ArianrhodItemSheet.#onPostToChat,
    },
  };

  static PARTS = {
    header: { template: "systems/arianrhod2e/templates/item/parts/header.hbs" },
    tabs: { template: "systems/arianrhod2e/templates/item/parts/tabs.hbs" },
    attributes: { template: "systems/arianrhod2e/templates/item/parts/attributes.hbs" },
    description: { template: "systems/arianrhod2e/templates/item/parts/description.hbs" },
  };

  tabGroups = {
    primary: "attributes",
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const systemData = this.item.system;

    context.system = systemData;
    context.config = CONFIG.ARIANRHOD;
    context.itemType = this.item.type;
    context.editable = this.isEditable;

    // Enrich description
    context.enrichedDescription = await TextEditor.enrichHTML(
      systemData.description ?? "",
      { async: true }
    );

    // Tabs
    context.tabs = {};
    for (const [id, label] of Object.entries({ attributes: "ARIANRHOD.CombatStats", description: "ARIANRHOD.Description" })) {
      context.tabs[id] = {
        id,
        label: game.i18n.localize(label),
        active: this.tabGroups.primary === id,
        cssClass: this.tabGroups.primary === id ? "active" : "",
      };
    }

    return context;
  }

  static async #onPostToChat(event, target) {
    event.preventDefault();
    await this.item.postToChat();
  }
}
