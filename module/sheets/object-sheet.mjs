/**
 * Actor sheet for Arianrhod RPG 2E Object actors (doors, chests, barricades, etc.).
 * Simple ApplicationV2 sheet with HP bar, defense stats, and special effect.
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class ArianrhodObjectSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["arianrhod2e", "sheet", "object-sheet"],
    tag: "form",
    position: { width: 420, height: 400 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage: ArianrhodObjectSheet.#onEditImage,
    },
  };

  static PARTS = {
    body: {
      template: "systems/arianrhod2e/templates/sheets/object-sheet.hbs",
    },
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sys = this.actor.system;
    context.actor = {
      name: this.actor.name,
      img: this.actor.img,
      id: this.actor.id,
    };
    context.system = sys;
    context.config = CONFIG.ARIANRHOD;
    context.editable = this.isEditable;
    context.hpPercent = sys.hp?.max > 0
      ? Math.min(100, Math.max(0, Math.round((sys.hp.value / sys.hp.max) * 100)))
      : 0;
    context.isDestroyed = sys.destroyed || (sys.hp?.value <= 0 && sys.hp?.max > 0);
    context.hasUses = sys.uses?.max > 0;

    // Enrich description
    context.enrichedDescription = await TextEditor.enrichHTML(sys.description ?? "", { async: true });

    return context;
  }

  static async #onEditImage(event, target) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: async (path) => {
        await this.actor.update({ img: path });
      },
    });
    return fp.browse();
  }
}
