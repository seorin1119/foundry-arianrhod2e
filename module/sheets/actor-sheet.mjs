import { rollCheckDialog, rollLifePath } from "../dice.mjs";

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
      rollLifePath: ArianrhodActorSheet.#onRollLifePath,
      editImage: ArianrhodActorSheet.#onEditImage,
      createItem: ArianrhodActorSheet.#onCreateItem,
      editItem: ArianrhodActorSheet.#onEditItem,
      deleteItem: ArianrhodActorSheet.#onDeleteItem,
      equipItem: ArianrhodActorSheet.#onEquipItem,
      postItem: ArianrhodActorSheet.#onPostItem,
      addConnection: ArianrhodActorSheet.#onAddConnection,
      deleteConnection: ArianrhodActorSheet.#onDeleteConnection,
      addGrowthLog: ArianrhodActorSheet.#onAddGrowthLog,
      deleteGrowthLog: ArianrhodActorSheet.#onDeleteGrowthLog,
      levelUp: ArianrhodActorSheet.#onLevelUp,
      levelDown: ArianrhodActorSheet.#onLevelDown,
      increaseAbility: ArianrhodActorSheet.#onIncreaseAbility,
      decreaseAbility: ArianrhodActorSheet.#onDecreaseAbility,
      increaseSkillLevel: ArianrhodActorSheet.#onIncreaseSkillLevel,
      decreaseSkillLevel: ArianrhodActorSheet.#onDecreaseSkillLevel,
      filterSkills: ArianrhodActorSheet.#onFilterSkills,
    },
  };

  static PARTS = {
    header: {
      template: "systems/arianrhod2e/templates/actor/parts/header.hbs"
    },
    tabs: {
      template: "systems/arianrhod2e/templates/actor/parts/tabs.hbs"
    },
    abilities: {
      template: "systems/arianrhod2e/templates/actor/parts/abilities.hbs",
      scrollable: [""]
    },
    items: {
      template: "systems/arianrhod2e/templates/actor/parts/items.hbs",
      scrollable: [""]
    },
    skills: {
      template: "systems/arianrhod2e/templates/actor/parts/skills.hbs",
      scrollable: [""]
    },
    biography: {
      template: "systems/arianrhod2e/templates/actor/parts/biography.hbs",
      scrollable: [""]
    },
    connections: {
      template: "systems/arianrhod2e/templates/actor/parts/connections.hbs",
      scrollable: [""]
    },
    // Enemy-specific parts
    enemyHeader: {
      template: "systems/arianrhod2e/templates/actor/parts/enemy-header.hbs"
    },
    enemyAbilities: {
      template: "systems/arianrhod2e/templates/actor/parts/enemy-abilities.hbs",
      scrollable: [""]
    },
    description: {
      template: "systems/arianrhod2e/templates/actor/parts/enemy-description.hbs",
      scrollable: [""]
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (this.document.type === "character") {
      options.parts = ["header", "tabs", "abilities", "items", "skills", "connections", "biography"];
    } else {
      options.parts = ["enemyHeader", "tabs", "enemyAbilities", "skills", "description"];
    }
  }

  tabGroups = {
    primary: "abilities",
  };

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this._activateTabNavigation();
  }

  /**
   * Activate tab navigation handlers.
   */
  _activateTabNavigation() {
    const tabs = this.element.querySelector('[data-group="primary"]');
    if (!tabs) return;

    // Add click handlers for all tab links
    tabs.querySelectorAll('[data-tab]').forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        const tabId = tab.dataset.tab;
        this._onChangeTab(tabId);
      });
    });
  }

  /**
   * Handle tab changes.
   */
  _onChangeTab(tabId) {
    // Update the active tab
    this.tabGroups.primary = tabId;

    // Update tab UI
    const tabs = this.element.querySelector('[data-group="primary"]');
    if (tabs) {
      tabs.querySelectorAll('[data-tab]').forEach(tab => {
        if (tab.dataset.tab === tabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }

    // Update tab content visibility
    this.element.querySelectorAll('.tab[data-group="primary"]').forEach(content => {
      if (content.dataset.tab === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const systemData = this.actor.system;

    // Add actor document properties for template access
    context.actor = {
      name: this.actor.name,
      img: this.actor.img,
      id: this.actor.id,
      type: this.actor.type
    };
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
          mod: ability.mod || 0,
          total: ability.total || ability.value,
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

    // Prepare equipment slot summary
    if (context.isCharacter) {
      context.equipSlots = this._prepareEquipSlots(context);
    }

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
      ? { abilities: "ARIANRHOD.TabAbilities", items: "ARIANRHOD.TabItems", skills: "ARIANRHOD.TabSkills", connections: "ARIANRHOD.TabConnections", biography: "ARIANRHOD.TabBiography" }
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

  /**
   * Build equipment slot summary from equipped items.
   */
  _prepareEquipSlots(context) {
    const equipped = this.actor.items.filter((i) => i.system.equipped);
    const slotDefs = [
      { key: "right", label: game.i18n.localize("ARIANRHOD.SlotRight") },
      { key: "left", label: game.i18n.localize("ARIANRHOD.SlotLeft") },
      { key: "head", label: game.i18n.localize("ARIANRHOD.SlotHead") },
      { key: "body", label: game.i18n.localize("ARIANRHOD.SlotBody") },
      { key: "accessory1", label: game.i18n.localize("ARIANRHOD.SlotAccessory1") },
      { key: "accessory2", label: game.i18n.localize("ARIANRHOD.SlotAccessory2") },
    ];

    return slotDefs.map((slot) => {
      const item = equipped.find((i) => i.system.slot === slot.key);
      let summary = "";
      if (item) {
        if (item.type === "weapon") {
          summary = `${game.i18n.localize("ARIANRHOD.Accuracy")}:${item.system.accuracy} ${game.i18n.localize("ARIANRHOD.Attack")}:${item.system.attack}`;
        } else if (item.type === "armor") {
          summary = `${game.i18n.localize("ARIANRHOD.PhysDef")}:${item.system.physDef} ${game.i18n.localize("ARIANRHOD.MagDef")}:${item.system.magDef}`;
        } else if (item.type === "accessory") {
          summary = item.system.effect ?? "";
        }
      }
      return { ...slot, item, summary };
    });
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

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

  static async #onRollLifePath(event, target) {
    event.preventDefault();
    const category = target.dataset.category;
    if (!category || !["origin", "circumstance", "objective"].includes(category)) {
      return;
    }

    const result = await rollLifePath(category, this.actor);

    // Auto-select the rolled entry in the dropdown
    if (result.tableKey) {
      await this.actor.update({
        system: {
          lifePath: {
            [category]: result.tableKey
          }
        }
      });
    }
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

  static async #onAddConnection(event, target) {
    event.preventDefault();
    const connections = [...(this.actor.system.connections ?? [])];
    connections.push({ name: "", relation: "", place: "", info: "" });
    await this.actor.update({ "system.connections": connections });
  }

  static async #onDeleteConnection(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    const connections = [...(this.actor.system.connections ?? [])];
    connections.splice(index, 1);
    await this.actor.update({ "system.connections": connections });
  }

  static async #onAddGrowthLog(event, target) {
    event.preventDefault();
    const log = [...(this.actor.system.growthLog ?? [])];
    log.push({ level: this.actor.system.level, abilities: "", skills: "", growthPts: 0, gold: 0, notes: "" });
    await this.actor.update({ "system.growthLog": log });
  }

  static async #onDeleteGrowthLog(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    const log = [...(this.actor.system.growthLog ?? [])];
    log.splice(index, 1);
    await this.actor.update({ "system.growthLog": log });
  }

  static async #onLevelUp(event, target) {
    event.preventDefault();
    const currentLevel = this.actor.system.level;
    await this.actor.update({ "system.level": currentLevel + 1 });
    ui.notifications.info(game.i18n.format("ARIANRHOD.LevelUpNotification", { level: currentLevel + 1 }));
  }

  static async #onLevelDown(event, target) {
    event.preventDefault();
    const currentLevel = this.actor.system.level;
    if (currentLevel > 1) {
      await this.actor.update({ "system.level": currentLevel - 1 });
      ui.notifications.info(game.i18n.format("ARIANRHOD.LevelDownNotification", { level: currentLevel - 1 }));
    }
  }

  static async #onIncreaseAbility(event, target) {
    event.preventDefault();
    const abilityKey = target.dataset.ability;
    const currentValue = this.actor.system.abilities[abilityKey].value;
    const remainingPoints = this.actor.system.growthPoints.remaining;

    if (remainingPoints <= 0) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoGrowthPointsRemaining"));
      return;
    }

    // Increase ability and track spent growth points
    await this.actor.update({
      [`system.abilities.${abilityKey}.value`]: currentValue + 1,
      "system.growthPoints.spent": this.actor.system.growthPoints.spent + 1
    });
  }

  static async #onDecreaseAbility(event, target) {
    event.preventDefault();
    const abilityKey = target.dataset.ability;
    const currentValue = this.actor.system.abilities[abilityKey].value;
    const spentPoints = this.actor.system.growthPoints.spent;

    if (currentValue <= 0) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.AbilityCannotBeNegative"));
      return;
    }

    if (spentPoints <= 0) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoSpentGrowthPoints"));
      return;
    }

    // Decrease ability and refund growth point
    await this.actor.update({
      [`system.abilities.${abilityKey}.value`]: currentValue - 1,
      "system.growthPoints.spent": this.actor.system.growthPoints.spent - 1
    });
  }

  static async #onIncreaseSkillLevel(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const currentLevel = item.system.level;
    const maxLevel = item.system.maxLevel;

    if (currentLevel >= maxLevel) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.SkillMaxLevelReached"));
      return;
    }

    await item.update({ "system.level": currentLevel + 1 });
  }

  static async #onDecreaseSkillLevel(event, target) {
    event.preventDefault();
    const itemId = target.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const currentLevel = item.system.level;

    if (currentLevel <= 1) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.SkillMinLevelReached"));
      return;
    }

    await item.update({ "system.level": currentLevel - 1 });
  }

  static #onFilterSkills(event, target) {
    event.preventDefault();
    event.stopPropagation();
    const filterValue = target.value;

    // Store filter preference (could be expanded to save to actor flags)
    this._skillFilter = filterValue;

    // Re-render to apply filter
    this.render();
  }
}
