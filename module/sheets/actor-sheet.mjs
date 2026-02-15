import { rollCheckDialog, rollLifePath } from "../dice.mjs";
import { SkillSelectionDialog } from "../apps/skill-selection-dialog.mjs";
import { EnemySkillSelectionDialog } from "../apps/enemy-skill-selection-dialog.mjs";
import { EquipmentSelectionDialog } from "../apps/equipment-selection-dialog.mjs";
import { activateSkill } from "../helpers/skill-activation.mjs";

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
    dragDrop: [
      { dragSelector: ".item[data-item-id]", dropSelector: null }
    ],
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
      activateSkill: ArianrhodActorSheet.#onActivateSkill,
      rollAttack: ArianrhodActorSheet.#onRollAttack,
      rollDamage: ArianrhodActorSheet.#onRollDamage,
      rollEvasion: ArianrhodActorSheet.#onRollEvasion,
      toggleStatus: ArianrhodActorSheet.#onToggleStatus,
      rollSpecialCheck: ArianrhodActorSheet.#onRollSpecialCheck,
      setFate: ArianrhodActorSheet.#onSetFate,
      adjustResource: ArianrhodActorSheet.#onAdjustResource,
      rollRelation: ArianrhodActorSheet.#onRollRelation,
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
      scrollable: []
    },
    items: {
      template: "systems/arianrhod2e/templates/actor/parts/items.hbs",
      scrollable: []
    },
    skills: {
      template: "systems/arianrhod2e/templates/actor/parts/skills.hbs",
      scrollable: []
    },
    biography: {
      template: "systems/arianrhod2e/templates/actor/parts/biography.hbs",
      scrollable: []
    },
    connections: {
      template: "systems/arianrhod2e/templates/actor/parts/connections.hbs",
      scrollable: []
    },
    // Enemy-specific parts
    enemyHeader: {
      template: "systems/arianrhod2e/templates/actor/parts/enemy-header.hbs"
    },
    enemyAbilities: {
      template: "systems/arianrhod2e/templates/actor/parts/enemy-abilities.hbs",
      scrollable: []
    },
    description: {
      template: "systems/arianrhod2e/templates/actor/parts/enemy-description.hbs",
      scrollable: []
    },
  };

  static TABS = {
    primary: {
      initial: "abilities",
      tabs: [
        { id: "abilities", label: "ARIANRHOD.TabAbilities" },
        { id: "items", label: "ARIANRHOD.TabItems" },
        { id: "skills", label: "ARIANRHOD.TabSkills" },
        { id: "connections", label: "ARIANRHOD.TabConnections" },
        { id: "biography", label: "ARIANRHOD.TabBiography" },
        { id: "description", label: "ARIANRHOD.TabDescription" },
      ]
    }
  };

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // ApplicationV2 actions only handle click events by default.
    // select/input elements that use data-action need change event listeners.
    const html = this.element;

    // filterSkills select — fires on change, not click
    const filterSelect = html.querySelector('select[data-action="filterSkills"]');
    if (filterSelect) {
      filterSelect.addEventListener("change", (event) => {
        this._skillFilter = event.target.value;
        this.render();
      });
    }

    // addStatusEffect select — fires on change
    const statusSelect = html.querySelector('select[data-action="addStatusEffect"]');
    if (statusSelect) {
      statusSelect.addEventListener("change", async (event) => {
        const statusId = event.target.value;
        if (!statusId) return;
        await this.actor.toggleStatusEffect(statusId);
        event.target.value = "";
      });
    }
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (this.document.type === "character") {
      options.parts = ["header", "tabs", "abilities", "items", "skills", "connections", "biography"];
    } else {
      options.parts = ["enemyHeader", "tabs", "enemyAbilities", "skills", "description"];
    }
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

    // Compute resource bar percentages
    const hp = systemData.combat?.hp;
    const mp = systemData.combat?.mp;
    const fate = systemData.fate;
    context.hpPercent = hp?.max ? Math.min(100, Math.max(0, Math.round((hp.value / hp.max) * 100))) : 0;
    context.mpPercent = mp?.max ? Math.min(100, Math.max(0, Math.round((mp.value / mp.max) * 100))) : 0;
    context.fatePercent = fate?.max ? Math.min(100, Math.max(0, Math.round((fate.value / fate.max) * 100))) : 0;

    // Fate dots for visual display
    const fateMax = fate?.max ?? 5;
    const fateVal = fate?.value ?? 0;
    context.fateDots = [];
    for (let i = 1; i <= fateMax; i++) {
      context.fateDots.push({ index: i, filled: i <= fateVal, isMax: i === fateMax });
    }

    // Prepare status effects
    const activeStatusIds = new Set();
    context.statusEffects = this.actor.effects
      .filter(e => e.statuses.size > 0)
      .map(e => {
        const statusId = e.statuses.first();
        activeStatusIds.add(statusId);
        return {
          id: statusId,
          label: e.name,
          icon: e.icon
        };
      });
    context.availableStatuses = (CONFIG.statusEffects ?? [])
      .filter(s => !activeStatusIds.has(s.id))
      .map(s => ({
        id: s.id,
        label: game.i18n.localize(s.name)
      }));

    // Categorize items
    context.weapons = this.actor.items.filter((i) => i.type === "weapon");
    context.armors = this.actor.items.filter((i) => i.type === "armor");
    context.accessories = this.actor.items.filter((i) => i.type === "accessory");
    context.items = this.actor.items.filter((i) => i.type === "item");

    // Prepare skills with localized labels and apply filter
    const allClasses = { ...CONFIG.ARIANRHOD.mainClasses, ...CONFIG.ARIANRHOD.supportClasses, general: "ARIANRHOD.GeneralSkills" };
    let skillItems = this.actor.items.filter((i) => i.type === "skill");

    // Apply skill filter if set
    if (this._skillFilter && this._skillFilter !== "all") {
      const mainClass = this.actor.system.mainClass;
      const supportClass = this.actor.system.supportClass;
      skillItems = skillItems.filter(skill => {
        const sc = skill.system.skillClass;
        switch (this._skillFilter) {
          case "main": return sc === mainClass;
          case "support": return sc === supportClass;
          case "general": return sc === "general";
          default: return true;
        }
      });
    }

    context.skills = skillItems.map(skill => {
      const s = skill.toObject();
      s.system.skillClassLabel = game.i18n.localize(allClasses[skill.system.skillClass] ?? skill.system.skillClass);
      s.system.timingLabel = game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[skill.system.timing] ?? skill.system.timing);
      return s;
    });

    // Prepare equipment slot summary
    if (context.isCharacter) {
      context.equipSlots = this._prepareEquipSlots(context);
    }

    // Calculate inventory totals
    let totalWeight = 0;
    let totalValue = 0;
    for (const item of this.actor.items) {
      const w = item.system.weight ?? 0;
      const p = item.system.price ?? 0;
      const q = item.system.quantity ?? 1;
      if (item.type === "item") {
        totalWeight += w * q;
        totalValue += p * q;
      } else if (["weapon", "armor", "accessory"].includes(item.type)) {
        totalWeight += w;
        totalValue += p;
      }
    }
    context.totalWeight = totalWeight;
    context.totalValue = totalValue;
    context.totalItems = this.actor.items.filter(i => i.type !== "skill").size;

    // Connection relation dropdown options
    context.connectionRelations = CONFIG.ARIANRHOD.connectionRelations ?? {};

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

    // Tabs — use built-in v13 _prepareTabs and filter by actor type
    const tabIcons = {
      abilities: "fas fa-shield-halved",
      items: "fas fa-suitcase",
      skills: "fas fa-wand-magic-sparkles",
      connections: "fas fa-handshake",
      biography: "fas fa-scroll",
      description: "fas fa-scroll",
    };
    const allTabs = this._prepareTabs("primary");
    for (const [id, tab] of Object.entries(allTabs)) {
      tab.icon = tabIcons[id] ?? "";
    }
    if (this.actor.type === "character") {
      context.tabs = Object.fromEntries(
        Object.entries(allTabs).filter(([id]) =>
          ["abilities", "items", "skills", "connections", "biography"].includes(id)
        )
      );
    } else {
      context.tabs = Object.fromEntries(
        Object.entries(allTabs).filter(([id]) =>
          ["abilities", "skills", "description"].includes(id)
        )
      );
    }

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    // Map part IDs that differ from their tab IDs (e.g. enemyAbilities → abilities)
    const partToTab = { enemyAbilities: "abilities" };
    const tabId = partToTab[partId] ?? partId;
    context.tab = context.tabs?.[tabId];
    return context;
  }

  /**
   * Build equipment slot summary from equipped items.
   */
  _prepareEquipSlots(context) {
    const equipped = this.actor.items.filter((i) => i.system.equipped);
    const slotDefs = [
      { key: "right", label: game.i18n.localize("ARIANRHOD.SlotRight"), icon: "fa-hand-fist" },
      { key: "left", label: game.i18n.localize("ARIANRHOD.SlotLeft"), icon: "fa-hand" },
      { key: "head", label: game.i18n.localize("ARIANRHOD.SlotHead"), icon: "fa-hat-wizard" },
      { key: "body", label: game.i18n.localize("ARIANRHOD.SlotBody"), icon: "fa-shirt" },
      { key: "accessory1", label: game.i18n.localize("ARIANRHOD.SlotAccessory1"), icon: "fa-ring" },
      { key: "accessory2", label: game.i18n.localize("ARIANRHOD.SlotAccessory2"), icon: "fa-ring" },
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

    const checkLabel = game.i18n.localize("ARIANRHOD.Check");
    await rollCheckDialog({
      title: `${label} ${checkLabel}`,
      modifier: ability.bonus,
      maxFate: maxFate,
      label: `${label} ${checkLabel}`,
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

    // For skills, open the appropriate skill selection dialog
    if (type === "skill") {
      if (this.actor.type === "enemy") {
        const dialog = new EnemySkillSelectionDialog(this.actor);
        dialog.render(true);
      } else {
        const dialog = new SkillSelectionDialog(this.actor);
        dialog.render(true);
      }
      return;
    }

    // For equipment types, open the equipment selection dialog
    if (["weapon", "armor", "accessory", "item"].includes(type)) {
      const dialog = new EquipmentSelectionDialog(this.actor, type);
      dialog.render(true);
      return;
    }

    // Fallback: create blank item
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

  static async #onRollRelation(event, target) {
    event.preventDefault();
    const index = Number(target.dataset.index);
    const roll = new Roll("2d6");
    await roll.evaluate();
    const die1 = roll.dice[0].results[0].result;
    const die2 = roll.dice[0].results[1].result;
    const d66 = die1 * 10 + die2;
    const table = CONFIG.ARIANRHOD.connectionD66Table ?? {};
    const relationKey = table[d66] ?? "friend";
    const relationLabel = game.i18n.localize(CONFIG.ARIANRHOD.connectionRelations[relationKey] ?? relationKey);

    const connections = [...(this.actor.system.connections ?? [])];
    if (connections[index]) {
      connections[index].relation = relationKey;
      await this.actor.update({ "system.connections": connections });
    }

    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    await ChatMessage.create({
      speaker,
      flavor: `<i class="fas fa-dice"></i> ${game.i18n.localize("ARIANRHOD.RollRelation")}`,
      content: `<div class="ar-combat-card"><div class="ar-card-row"><span class="ar-card-label">D66: ${die1}${die2}</span><span class="ar-card-value">${relationLabel}</span></div></div>`,
      rolls: [roll],
    });
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

  static async #onActivateSkill(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;
    await activateSkill(this.actor, item);
  }

  static async #onToggleStatus(event, target) {
    event.preventDefault();
    const statusId = target.dataset.statusId;
    if (statusId) await this.actor.toggleStatusEffect(statusId);
  }

  static async #onRollAttack(event, target) {
    event.preventDefault();
    await this.actor.rollAttack();
  }

  static async #onRollDamage(event, target) {
    event.preventDefault();
    await this.actor.rollDamage();
  }

  static async #onRollEvasion(event, target) {
    event.preventDefault();
    await this.actor.rollEvasion();
  }

  static async #onAdjustResource(event, target) {
    event.preventDefault();
    const resource = target.dataset.resource;
    const delta = Number(target.dataset.delta);
    const path = resource === "hp" ? "system.combat.hp" : "system.combat.mp";
    const current = resource === "hp" ? this.actor.system.combat.hp : this.actor.system.combat.mp;
    const newValue = Math.max(0, Math.min(current.value + delta, current.max));
    await this.actor.update({ [`${path}.value`]: newValue });
  }

  static async #onSetFate(event, target) {
    event.preventDefault();
    const value = Number(target.dataset.value);
    const currentValue = this.actor.system.fate.value;
    // Toggle: if clicking the same dot that matches current value, decrease by 1
    const newValue = (value === currentValue) ? value - 1 : value;
    await this.actor.update({ "system.fate.value": Math.max(0, newValue) });
  }

  static async #onRollSpecialCheck(event, target) {
    event.preventDefault();
    const checkKey = target.dataset.check;
    const checkValue = this.actor.system.specialChecks?.[checkKey] ?? 0;
    const checkLabels = {
      alchemy: "ARIANRHOD.CheckAlchemy",
      trapDisarm: "ARIANRHOD.CheckTrapDisarm",
      trapDetect: "ARIANRHOD.CheckTrapDetect",
      dangerSense: "ARIANRHOD.CheckDangerSense",
      magicCheck: "ARIANRHOD.CheckMagic",
      enemyIdentify: "ARIANRHOD.CheckEnemyIdentify",
      itemAppraise: "ARIANRHOD.CheckItemAppraise",
    };
    const label = game.i18n.localize(checkLabels[checkKey] ?? checkKey);
    const checkLabel = game.i18n.localize("ARIANRHOD.Check");
    const maxFate = this.actor.type === "character" ? this.actor.system.fate.value : 0;

    await rollCheckDialog({
      title: `${label} ${checkLabel}`,
      modifier: checkValue,
      maxFate: maxFate,
      label: `${label} ${checkLabel}`,
      actor: this.actor,
    });
  }
}
