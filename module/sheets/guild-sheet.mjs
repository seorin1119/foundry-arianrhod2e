const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Actor sheet for Arianrhod RPG 2E guilds.
 * Uses the v13 ApplicationV2 framework.
 * @extends {ActorSheetV2}
 */
export class ArianrhodGuildSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["arianrhod2e", "sheet", "guild"],
    tag: "form",
    position: { width: 600, height: 600 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
    },
    actions: {
      addSupport: ArianrhodGuildSheet.#onAddSupport,
      removeSupport: ArianrhodGuildSheet.#onRemoveSupport,
      addMember: ArianrhodGuildSheet.#onAddMember,
      removeMember: ArianrhodGuildSheet.#onRemoveMember,
      editImage: ArianrhodGuildSheet.#onEditImage,
      levelUp: ArianrhodGuildSheet.#onLevelUp,
      levelDown: ArianrhodGuildSheet.#onLevelDown,
    },
  };

  static PARTS = {
    guild: {
      template: "systems/arianrhod2e/templates/actor/guild-sheet.hbs",
      scrollable: []
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const systemData = this.actor.system;

    // Actor document properties for template access
    context.actor = {
      name: this.actor.name,
      img: this.actor.img,
      id: this.actor.id,
    };
    context.system = systemData;
    context.config = CONFIG.ARIANRHOD;
    context.editable = this.isEditable;

    // Resolve guild supports with locale-appropriate names and effects
    const library = CONFIG.ARIANRHOD.guildSupports ?? [];
    const lang = game.i18n.lang;

    context.resolvedSupports = systemData.supports.map((s, index) => {
      const data = library.find(gs => gs.id === s.supportId);
      if (!data) return { index, supportId: s.supportId, name: s.supportId, level: "?", timing: "", timingLabel: "", duplicate: false, condition: "", effect: "" };

      const name = lang === "ko" ? data.nameKo : lang === "en" ? data.nameEn : data.name;
      const effect = lang === "ko" ? data.effectKo : lang === "en" ? data.effectEn : data.effectJa;
      const timingKey = CONFIG.ARIANRHOD.skillTimings[data.timing] ?? data.timing;
      const timingLabel = game.i18n.localize(timingKey);

      return {
        index,
        supportId: s.supportId,
        name,
        level: data.level,
        timing: data.timing,
        timingLabel,
        duplicate: data.duplicate,
        condition: data.condition,
        effect,
      };
    });

    // Available supports based on guild level, resolved with locale names/effects
    context.availableSupports = library
      .filter(gs => gs.level <= systemData.guildLevel)
      .map(gs => {
        const name = lang === "ko" ? gs.nameKo : lang === "en" ? gs.nameEn : gs.name;
        const effect = lang === "ko" ? gs.effectKo : lang === "en" ? gs.effectEn : gs.effectJa;
        return { ...gs, localeName: name, localeEffect: effect };
      });

    // Support slot calculations
    context.maxSupports = systemData.guildLevel + 2;
    context.remainingSlots = context.maxSupports - systemData.supports.length;

    // Enrich description HTML
    context.enrichedDescription = await TextEditor.enrichHTML(
      systemData.description ?? "",
      { async: true }
    );

    return context;
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  static async #onAddSupport(event, target) {
    event.preventDefault();
    const system = this.actor.system;
    if (system.supports.length >= system.maxSupports) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.GuildSupportSlotsFull"));
      return;
    }

    // Get available supports for current guild level
    const library = CONFIG.ARIANRHOD.guildSupports ?? [];
    const available = library.filter(gs => gs.level <= system.guildLevel);
    const lang = game.i18n.lang;

    const options = available.map(gs => {
      const name = lang === "ko" ? gs.nameKo : lang === "en" ? gs.nameEn : gs.name;
      return `<option value="${gs.id}">Lv${gs.level} - ${name}${gs.duplicate ? " \u2726" : ""}</option>`;
    }).join("");

    const content = `<form><div class="form-group"><label>${game.i18n.localize("ARIANRHOD.GuildSupport")}</label><select name="supportId">${options}</select></div></form>`;

    const dlg = await Dialog.confirm({
      title: game.i18n.localize("ARIANRHOD.AddGuildSupport"),
      content,
      yes: (html) => {
        const supportId = html.querySelector('select[name="supportId"]').value;
        return supportId;
      },
      no: () => null,
      defaultYes: true,
    });

    if (!dlg) return;

    // Check if support already acquired and not duplicate-allowed
    const supportData = library.find(gs => gs.id === dlg);
    const alreadyHas = system.supports.some(s => s.supportId === dlg);
    if (alreadyHas && !supportData?.duplicate) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.GuildSupportAlreadyAcquired"));
      return;
    }

    const supports = [...system.supports, { supportId: dlg }];
    await this.actor.update({ "system.supports": supports });
  }

  static async #onRemoveSupport(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    const supports = [...this.actor.system.supports];
    supports.splice(index, 1);
    await this.actor.update({ "system.supports": supports });
  }

  static async #onAddMember(event, target) {
    event.preventDefault();
    const members = [...(this.actor.system.members ?? [])];
    members.push({ name: "", actorId: "", role: "" });
    await this.actor.update({ "system.members": members });
  }

  static async #onRemoveMember(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    const members = [...(this.actor.system.members ?? [])];
    members.splice(index, 1);
    await this.actor.update({ "system.members": members });
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

  static async #onLevelUp(event, target) {
    event.preventDefault();
    const currentLevel = this.actor.system.guildLevel;
    if (currentLevel >= 5) return;
    await this.actor.update({ "system.guildLevel": currentLevel + 1 });
  }

  static async #onLevelDown(event, target) {
    event.preventDefault();
    const currentLevel = this.actor.system.guildLevel;
    if (currentLevel <= 1) return;
    await this.actor.update({ "system.guildLevel": currentLevel - 1 });
  }
}
