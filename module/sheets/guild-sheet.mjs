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
      activateSupport: ArianrhodGuildSheet.#onActivateSupport,
      resetSupportUses: ArianrhodGuildSheet.#onResetSupportUses,
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
      if (!data) return { index, supportId: s.supportId, name: s.supportId, level: "?", timing: "", timingLabel: "", duplicate: false, condition: "", effect: "", isActivatable: false, isUsed: false };

      const name = lang === "ko" ? data.nameKo : lang === "en" ? data.nameEn : data.name;
      const effect = lang === "ko" ? data.effectKo : lang === "en" ? data.effectEn : data.effectJa;
      const timingKey = CONFIG.ARIANRHOD.skillTimings[data.timing] ?? data.timing;
      const timingLabel = game.i18n.localize(timingKey);

      const isActivatable = ["action", "free", "setup", "other"].includes(data.timing);
      const useEntry = systemData.supportUses?.find(u => u.supportId === s.supportId);

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
        isActivatable,
        isUsed: useEntry?.used ?? false,
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

  static async #onActivateSupport(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    const support = this.actor.system.supports[index];
    if (!support) return;

    const supportId = support.supportId;
    const library = CONFIG.ARIANRHOD.guildSupports ?? [];
    const supportData = library.find(gs => gs.id === supportId);
    if (!supportData) return;

    const lang = game.i18n.lang;
    const supportName = lang === "ko" ? supportData.nameKo : lang === "en" ? supportData.nameEn : supportData.name;

    // Check if already used
    const uses = [...(this.actor.system.supportUses ?? [])];
    const useEntry = uses.find(u => u.supportId === supportId);
    if (useEntry?.used) {
      ui.notifications.warn(game.i18n.format("ARIANRHOD.SupportAlreadyUsed", { name: supportName }));
      return;
    }

    // Mark as used
    if (useEntry) {
      useEntry.used = true;
    } else {
      uses.push({ supportId, used: true });
    }
    await this.actor.update({ "system.supportUses": uses });

    // Get guild members
    const members = (this.actor.system.members ?? [])
      .map(m => game.actors.get(m.actorId))
      .filter(a => a);
    const gl = this.actor.system.guildLevel ?? 1;

    // Execute support effect based on type
    switch (supportId) {
      case "drops_of_life": {
        const diceCount = gl + 2;
        const roll = new Roll(`${diceCount}d6`);
        await roll.evaluate();
        const healAmount = roll.total;
        for (const member of members) {
          const newHp = Math.min(member.system.combat.hp.max, member.system.combat.hp.value + healAmount);
          const newMp = Math.min(member.system.combat.mp.max, member.system.combat.mp.value + healAmount);
          await member.update({
            "system.combat.hp.value": newHp,
            "system.combat.mp.value": newMp,
          }, { arianrhod2e: { incapacitationRecovery: true } });
        }
        await ChatMessage.create({
          content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-heart"></i> ${supportName}: ${game.i18n.format("ARIANRHOD.SupportHealAll", { amount: healAmount })}</div></div>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          rolls: [roll],
        });
        break;
      }
      case "resurrection": {
        for (const member of members) {
          await member.update({
            "system.combat.hp.value": member.system.combat.hp.max,
          }, { arianrhod2e: { incapacitationRecovery: true } });
        }
        await ChatMessage.create({
          content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-cross"></i> ${supportName}: ${game.i18n.localize("ARIANRHOD.SupportResurrection")}</div></div>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
        break;
      }
      case "divine_blessing": {
        for (const member of members) {
          await member.update({
            "system.combat.mp.value": member.system.combat.mp.max,
          });
        }
        await ChatMessage.create({
          content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-sparkles"></i> ${supportName}: ${game.i18n.localize("ARIANRHOD.SupportDivineBlessing")}</div></div>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
        break;
      }
      case "appraiser": {
        if (this.actor.system.gold < 100) {
          ui.notifications.warn(game.i18n.localize("ARIANRHOD.InsufficientGold"));
          const undoUses = uses.map(u => u.supportId === supportId ? { ...u, used: false } : u);
          await this.actor.update({ "system.supportUses": undoUses });
          return;
        }
        await this.actor.update({ "system.gold": this.actor.system.gold - 100 });
        await ChatMessage.create({
          content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-gem"></i> ${supportName}: ${game.i18n.localize("ARIANRHOD.SupportAppraiser")} (-100G)</div></div>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
        break;
      }
      case "reservoir": {
        const fateRecover = Math.floor(gl / 5) + 1;
        for (const member of members) {
          if (member.type !== "character") continue;
          const newFate = Math.min(member.system.fate.max, member.system.fate.value + fateRecover);
          await member.update({ "system.fate.value": newFate });
        }
        await ChatMessage.create({
          content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-hand-sparkles"></i> ${supportName}: ${game.i18n.format("ARIANRHOD.SupportReservoir", { amount: fateRecover })}</div></div>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
        break;
      }
      default: {
        const effect = lang === "ko" ? supportData.effectKo : lang === "en" ? supportData.effectEn : supportData.effectJa;
        await ChatMessage.create({
          content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-guild"><i class="fas fa-shield-heart"></i> ${supportName}</div><div class="ar-card-row"><span class="ar-card-label">${effect}</span></div></div>`,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
        break;
      }
    }
  }

  static async #onResetSupportUses(event, target) {
    event.preventDefault();
    await this.actor.update({ "system.supportUses": [] });
    ui.notifications.info(game.i18n.localize("ARIANRHOD.SupportUsesReset"));
  }
}
