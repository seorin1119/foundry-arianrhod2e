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
      editImage: ArianrhodItemSheet.#onEditImage,
    },
  };

  static PARTS = {
    header: { template: "systems/arianrhod2e/templates/item/parts/header.hbs" },
    tabs: { template: "systems/arianrhod2e/templates/item/parts/tabs.hbs" },
    attributes: { template: "systems/arianrhod2e/templates/item/parts/attributes.hbs" },
    description: { template: "systems/arianrhod2e/templates/item/parts/description.hbs" },
  };

  static TABS = {
    primary: {
      initial: "attributes",
      tabs: [
        { id: "attributes", label: "ARIANRHOD.CombatStats" },
        { id: "description", label: "ARIANRHOD.Description" },
      ]
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const systemData = this.item.system;

    context.system = systemData;
    context.config = CONFIG.ARIANRHOD;
    context.itemType = this.item.type;
    context.editable = this.isEditable;

    // Prepare combined skill class options for skill items
    if (this.item.type === "skill") {
      context.allSkillClasses = {
        general: "ARIANRHOD.GeneralSkills",
        ...CONFIG.ARIANRHOD.supportClasses
      };
    }

    // Prepare trap config options
    if (this.item.type === "trap") {
      context.trapStructures = CONFIG.ARIANRHOD.trapStructures;
      context.trapConditions = CONFIG.ARIANRHOD.trapConditions;
    }

    // Enrich description
    context.enrichedDescription = await TextEditor.enrichHTML(
      systemData.description ?? "",
      { async: true }
    );

    // Tabs — use built-in v13 _prepareTabs
    context.tabs = this._prepareTabs("primary");

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId];
    return context;
  }

  static async #onPostToChat(event, target) {
    event.preventDefault();
    await this.item.postToChat();
  }

  static async #onEditImage(event, target) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.item.img,
      callback: async (path) => {
        await this.item.update({ img: path });
      },
    });
    return fp.browse();
  }
}
