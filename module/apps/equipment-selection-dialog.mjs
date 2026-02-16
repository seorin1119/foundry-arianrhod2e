/**
 * Resolve localized field from equipment data.
 */
function resolveLocalizedField(item, field, lang) {
  if (lang === "ko") {
    const koField = `${field}Ko`;
    if (item[koField]) return item[koField];
    if (field === "name") return item.nameEn || item.name;
    return item[field];
  }
  if (lang === "en") {
    const enField = `${field}En`;
    if (item[enField]) return item[enField];
    return item[field];
  }
  return item[field];
}

export class EquipmentSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(actor, itemType = "weapon", options = {}) {
    super(options);
    this.actor = actor;
    this._activeType = itemType;
  }

  static DEFAULT_OPTIONS = {
    id: "equipment-selection-{id}",
    classes: ["arianrhod2e", "dialog", "equipment-selection"],
    tag: "form",
    window: {
      title: "ARIANRHOD.EquipmentSelection",
      resizable: true,
    },
    position: {
      width: 750,
      height: 600,
    },
    actions: {
      addEquipment: EquipmentSelectionDialog.#onAddEquipment,
      setType: EquipmentSelectionDialog.#onSetType,
      createCustom: EquipmentSelectionDialog.#onCreateCustom,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/equipment-selection-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.EquipmentSelection");
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Category filter select
    const catSelect = html.querySelector("select.filter-category-select");
    if (catSelect) {
      catSelect.addEventListener("change", (event) => {
        this._filterCategory = event.target.value;
        this.render();
      });
    }

    // Search input
    const searchInput = html.querySelector("input.equip-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        this._searchQuery = event.target.value;
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => this.render(), 300);
      });
      if (this._searchQuery) {
        searchInput.focus();
        searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length;
      }
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const lang = game.i18n.lang;
    const activeType = this._activeType || "weapon";
    const filterCategory = this._filterCategory || "all";
    const searchQuery = this._searchQuery || "";

    context.activeType = activeType;
    context.isWeapon = activeType === "weapon";
    context.isArmor = activeType === "armor";
    context.isAccessory = activeType === "accessory";
    context.isItem = activeType === "item";
    context.filterCategory = filterCategory;
    context.searchQuery = searchQuery;

    const library = CONFIG.ARIANRHOD.equipmentLibrary;
    let items = [];

    // Get items based on active type
    if (activeType === "weapon") {
      items = library.weapons || [];
    } else if (activeType === "armor") {
      items = library.armor || [];
    } else if (activeType === "accessory") {
      items = library.accessories || [];
    } else if (activeType === "item") {
      items = library.items || [];
    }

    // Build category options
    const categorySet = new Set();
    items.forEach(i => { if (i.category) categorySet.add(i.category); });

    const categoryLabels = {
      // Weapon categories
      unarmed: "ARIANRHOD.WeaponTypeUnarmed",
      dagger: "ARIANRHOD.WeaponTypeDagger",
      longsword: "ARIANRHOD.WeaponTypeLongsword",
      greatsword: "ARIANRHOD.WeaponTypeGreatsword",
      axe: "ARIANRHOD.WeaponTypeAxe",
      spear: "ARIANRHOD.WeaponTypeSpear",
      whip: "ARIANRHOD.WeaponTypeWhip",
      blunt: "ARIANRHOD.WeaponTypeBlunt",
      bow: "ARIANRHOD.WeaponTypeBow",
      katana: "ARIANRHOD.WeaponTypeKatana",
      alchemy: "ARIANRHOD.WeaponTypeAlchemy",
      // Armor categories
      head: "ARIANRHOD.ArmorTypeHead",
      body: "ARIANRHOD.ArmorTypeBody",
      fullbody: "ARIANRHOD.ArmorTypeFullBody",
      shield: "ARIANRHOD.ArmorTypeShield",
      auxiliary: "ARIANRHOD.ArmorTypeAuxiliary",
      // Item categories
      potion: "ARIANRHOD.ItemTypePotion",
      food: "ARIANRHOD.ItemTypeFood",
      tool: "ARIANRHOD.ItemTypeTool",
      arrow: "ARIANRHOD.ItemTypeArrow",
      container: "ARIANRHOD.ItemTypeContainer",
    };

    context.categoryOptions = [...categorySet].sort().map(cat => ({
      value: cat,
      label: game.i18n.localize(categoryLabels[cat] || cat),
    }));
    context.showCategoryFilter = context.categoryOptions.length > 1;

    // Apply category filter
    if (filterCategory !== "all") {
      items = items.filter(i => i.category === filterCategory);
    }

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => {
        const dn = resolveLocalizedField(i, "name", lang);
        return dn.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          (i.nameEn && i.nameEn.toLowerCase().includes(q));
      });
    }

    // Resolve display fields
    context.equipment = items.map(item => {
      const displayName = resolveLocalizedField(item, "name", lang);
      const displayNameSub = (lang === "ja") ? item.nameEn : (displayName !== item.name ? item.name : item.nameEn);
      return {
        ...item,
        displayName,
        displayNameSub,
        displayEffect: resolveLocalizedField(item, "effect", lang) || "",
        displayPrice: item.price != null ? `${item.price}G` : "—",
      };
    });

    return context;
  }

  static #onSetType(event, target) {
    event.preventDefault();
    this._activeType = target.dataset.type;
    this._filterCategory = "all";
    this._searchQuery = "";
    this.render();
  }

  static async #onCreateCustom(event, target) {
    event.preventDefault();
    const type = this._activeType || "weapon";
    const typeName = game.i18n.localize(`ARIANRHOD.${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const name = `${game.i18n.localize("ARIANRHOD.ItemCreate")} ${typeName}`;
    await Item.create({ name, type, system: {} }, { parent: this.actor });
    ui.notifications.info(game.i18n.format("ARIANRHOD.EquipmentAdded", { name }));
    this.render();
  }

  static async #onAddEquipment(event, target) {
    event.preventDefault();
    const equipId = target.dataset.equipId;
    const equipType = target.dataset.equipType;
    if (!equipId) return;

    const library = CONFIG.ARIANRHOD.equipmentLibrary;
    let allItems = [];
    if (equipType === "weapon") allItems = library.weapons || [];
    else if (equipType === "armor") allItems = library.armor || [];
    else if (equipType === "accessory") allItems = library.accessories || [];
    else if (equipType === "item") allItems = library.items || [];

    const selected = allItems.find(i => i.id === equipId);
    if (!selected) return;

    const lang = game.i18n.lang;
    const displayName = resolveLocalizedField(selected, "name", lang);

    // Map library type to Foundry item type
    let foundryType = equipType;
    if (equipType === "armor" && selected.category === "shield") {
      foundryType = "armor"; // shields are armor type
    }

    // Build item data
    const itemData = {
      name: displayName,
      type: foundryType,
      system: {},
      flags: { arianrhod2e: { libraryId: selected.id } },
    };

    if (foundryType === "weapon") {
      itemData.system = {
        weaponType: selected.category,
        accuracy: selected.accuracy || 0,
        attack: selected.attack || 0,
        range: selected.range || 0,
        weight: selected.weight || 0,
        price: selected.price || 0,
        slot: selected.slot === "twoHand" ? "right" : "right",
        description: selected.note || "",
        equipped: true,
      };
    } else if (foundryType === "armor") {
      itemData.system = {
        armorType: selected.category,
        physDef: selected.physDef || 0,
        magDef: selected.magDef || 0,
        evasion: selected.evasion || 0,
        initiativeMod: selected.initiativeMod || 0,
        movementMod: selected.movementMod || 0,
        weight: selected.weight || 0,
        price: selected.price || 0,
        slot: selected.category === "head" ? "head" : (selected.category === "shield" ? "left" : "body"),
        description: selected.note || "",
        equipped: true,
      };
    } else if (foundryType === "accessory") {
      itemData.system = {
        effect: resolveLocalizedField(selected, "effect", lang) || "",
        weight: selected.weight || 0,
        price: selected.price || 0,
        description: selected.note || "",
        equipped: true,
      };
    } else if (foundryType === "item") {
      itemData.system = {
        itemType: selected.category,
        effect: resolveLocalizedField(selected, "effect", lang) || "",
        weight: selected.weight || 0,
        price: selected.price || 0,
        quantity: 1,
        description: selected.note || "",
      };
    }

    await Item.create(itemData, { parent: this.actor });
    ui.notifications.info(game.i18n.format("ARIANRHOD.EquipmentAdded", { name: displayName }));
    this.render();
  }
}
