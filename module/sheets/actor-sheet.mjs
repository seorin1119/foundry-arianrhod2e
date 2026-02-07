import { rollCheckDialog } from "../dice.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Actor sheet for Arianrhod RPG 2E characters and enemies.
 * Uses the v13 ApplicationV2 framework.
 * @extends {ActorSheetV2}
 */
export class ArianrhodActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["arianrhod2e", "sheet", "actor"],
    tag: "form",
    position: { width: 680, height: 720 },
    window: { resizable: true },
    form: {
      submitOnChange: true,
    },
    actions: {
      rollAbility: ArianrhodActorSheet.#onRollAbility,
      createItem: ArianrhodActorSheet.#onCreateItem,
      editItem: ArianrhodActorSheet.#onEditItem,
      deleteItem: ArianrhodActorSheet.#onDeleteItem,
      equipItem: ArianrhodActorSheet.#onEquipItem,
      postItem: ArianrhodActorSheet.#onPostItem,
    },
  };

  static PARTS = {
    header: { template: "systems/arianrhod2e/templates/actor/parts/header.hbs" },
    tabs: { template: "systems/arianrhod2e/templates/actor/parts/tabs.hbs" },
    abilities: { template: "systems/arianrhod2e/templates/actor/parts/abilities.hbs" },
    items: { template: "systems/arianrhod2e/templates/actor/parts/items.hbs" },
    skills: { template: "systems/arianrhod2e/templates/actor/parts/skills.hbs" },
    biography: { template: "systems/arianrhod2e/templates/actor/parts/biography.hbs" },
    // Enemy-specific parts
    enemyHeader: { template: "systems/arianrhod2e/templates/actor/parts/enemy-header.hbs" },
    enemyAbilities: { template: "systems/arianrhod2e/templates/actor/parts/enemy-abilities.hbs" },
    enemyDescription: { template: "systems/arianrhod2e/templates/actor/parts/enemy-description.hbs" },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (this.document.type === "character") {
      options.parts = ["header", "tabs", "abilities", "items", "skills", "biography"];
    } else {
      options.parts = ["enemyHeader", "tabs", "enemyAbilities", "skills", "enemyDescription"];
    }
  }

  tabGroups = {
    primary: "abilities",
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const systemData = this.actor.system;

    context.system = systemData;
    context.config = CONFIG.ARIANRHOD;
    context.isCharacter = this.actor.type === "character";
    context.isEnemy = this.actor.type === "enemy";
    context.editable = this.isEditable;

    // Prepare ability data with labels
    context.abilities = {};
    if (systemData.abilities) {
      for (const [key, ability] of Object.entries(systemData.abilities)) {
        context.abilities[key] = {
          value: ability.value,
          bonus: ability.bonus,
          label: game.i18n.localize(CONFIG.ARIANRHOD.abilities[key] ?? key),
          abbr: game.i18n.localize(CONFIG.ARIANRHOD.abilityAbbreviations[key] ?? key),
        };
      }
    }

    // Categorize items
    context.weapons = this.actor.items.filter((i) => i.type === "weapon");
    context.armors = this.actor.items.filter((i) => i.type === "armor");
    context.accessories = this.actor.items.filter((i) => i.type === "accessory");
    context.skills = this.actor.items.filter((i) => i.type === "skill");
    context.items = this.actor.items.filter((i) => i.type === "item");

    // Enrich HTML
    if (this.actor.type === "character") {
      context.enrichedBiography = await TextEditor.enrichHTML(
        systemData.biography ?? "",
        { async: true }
      );
    }
    if (this.actor.type === "enemy") {
      context.enrichedDescription = await TextEditor.enrichHTML(
        systemData.description ?? "",
        { async: true }
      );
    }

    // Tabs
    context.tabs = this._prepareTabs();

    return context;
  }

  /**
   * Prepare tab data for rendering.
   */
  _prepareTabs() {
    const tabs = {};
    const tabEntries = this.actor.type === "character"
      ? { abilities: "ARIANRHOD.TabAbilities", items: "ARIANRHOD.TabItems", skills: "ARIANRHOD.TabSkills", biography: "ARIANRHOD.TabBiography" }
      : { abilities: "ARIANRHOD.TabAbilities", skills: "ARIANRHOD.TabSkills", description: "ARIANRHOD.TabDescription" };

    for (const [id, label] of Object.entries(tabEntries)) {
      tabs[id] = {
        id,
        label: game.i18n.localize(label),
        active: this.tabGroups.primary === id,
        cssClass: this.tabGroups.primary === id ? "active" : "",
      };
    }
    return tabs;
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  static async #onRollAbility(event, target) {
    event.preventDefault();
    const abilityKey = target.dataset.ability;
    const ability = this.actor.system.abilities[abilityKey];
    const label = game.i18n.localize(CONFIG.ARIANRHOD.abilities[abilityKey] ?? abilityKey);
    const maxFate = this.actor.type === "character" ? this.actor.system.fate.value : 0;

    await rollCheckDialog({
      title: `${label} チェック`,
      modifier: ability.bonus,
      maxFate: maxFate,
      label: `${label} チェック`,
      actor: this.actor,
    });
  }

  static async #onCreateItem(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    const name = `${game.i18n.localize("ARIANRHOD.ItemCreate")} ${game.i18n.localize(`ARIANRHOD.${type.charAt(0).toUpperCase() + type.slice(1)}`)}`;
    await Item.create({ name, type, system: {} }, { parent: this.actor });
  }

  static #onEditItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    await item?.delete();
  }

  static async #onEquipItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    await item?.update({ "system.equipped": !item.system.equipped });
  }

  static async #onPostItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    await item?.postToChat();
  }
}
