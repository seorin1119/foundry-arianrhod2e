/**
 * Resolve a localized field from an enemy data object.
 * Fallback chain: locale-specific → nameEn → base (Japanese).
 * @param {object} enemy - Enemy data object from the library
 * @param {string} field - Base field name (e.g. "name", "effect")
 * @param {string} lang - Current language code (e.g. "ko", "en", "ja")
 * @returns {string} The resolved field value
 */
function resolveLocalizedField(enemy, field, lang) {
  if (lang === "ko") {
    const koField = `${field}Ko`;
    if (enemy[koField]) return enemy[koField];
    if (field === "name") return enemy.nameEn || enemy.name;
    return enemy[field];
  }
  if (lang === "en") {
    const enField = `${field}En`;
    if (enemy[enField]) return enemy[enField];
    return enemy[field];
  }
  return enemy[field];
}

/**
 * Dialog for creating enemy actors from the enemy library or as custom enemies.
 * Two-panel layout: left = enemy list with filters, right = preview of selected enemy.
 */
export class EnemyCreationDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(initialData = {}, options = {}) {
    super(options);
    this.initialData = initialData;
    this._selectedEnemyId = null;
    this._searchQuery = "";
    this._filterCategory = "all";
    this._filterType = "all";
    this._filterLevel = "all";
  }

  static DEFAULT_OPTIONS = {
    id: "enemy-creation-dialog",
    classes: ["arianrhod2e", "dialog", "enemy-creation"],
    tag: "form",
    window: {
      title: "ARIANRHOD.EnemyCreationTitle",
      resizable: true,
    },
    position: {
      width: 750,
      height: 620,
    },
    actions: {
      selectEnemy: EnemyCreationDialog.#onSelectEnemy,
      createFromLibrary: EnemyCreationDialog.#onCreateFromLibrary,
      createCustom: EnemyCreationDialog.#onCreateCustom,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/enemy-creation-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.EnemyCreationTitle");
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Search input with 300ms debounce
    const searchInput = html.querySelector("input.enemy-search-input");
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

    // Category filter
    const categorySelect = html.querySelector("select.enemy-filter-category");
    if (categorySelect) {
      categorySelect.addEventListener("change", (event) => {
        this._filterCategory = event.target.value;
        this.render();
      });
    }

    // Type filter
    const typeSelect = html.querySelector("select.enemy-filter-type");
    if (typeSelect) {
      typeSelect.addEventListener("change", (event) => {
        this._filterType = event.target.value;
        this.render();
      });
    }

    // Level filter
    const levelSelect = html.querySelector("select.enemy-filter-level");
    if (levelSelect) {
      levelSelect.addEventListener("change", (event) => {
        this._filterLevel = event.target.value;
        this.render();
      });
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const lang = game.i18n.lang;

    const { enemyLibrary, getEnemyTypes, getEnemyLevels } = await import("../helpers/enemy-library.mjs");

    let filtered = [...enemyLibrary];

    // Apply search filter
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const name = resolveLocalizedField(e, "name", lang);
        return name.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          (e.nameEn && e.nameEn.toLowerCase().includes(q));
      });
    }

    // Apply category filter
    if (this._filterCategory !== "all") {
      filtered = filtered.filter(e => e.category === this._filterCategory);
    }

    // Apply type filter
    if (this._filterType !== "all") {
      filtered = filtered.filter(e => e.type === this._filterType);
    }

    // Apply level filter
    if (this._filterLevel !== "all") {
      filtered = filtered.filter(e => e.level === Number(this._filterLevel));
    }

    // Type labels for i18n
    const typeLabels = {
      demon: game.i18n.localize("ARIANRHOD.EnemyTypeDemon"),
      undead: game.i18n.localize("ARIANRHOD.EnemyTypeUndead"),
      animal: game.i18n.localize("ARIANRHOD.EnemyTypeAnimal"),
      fairy: game.i18n.localize("ARIANRHOD.EnemyTypeFairy"),
      human: game.i18n.localize("ARIANRHOD.EnemyTypeHuman"),
      construct: game.i18n.localize("ARIANRHOD.EnemyTypeConstruct"),
      plant: game.i18n.localize("ARIANRHOD.EnemyTypePlant"),
      mechanical: game.i18n.localize("ARIANRHOD.EnemyTypeMechanical"),
    };

    // Element labels
    const elementLabels = {
      none: game.i18n.localize("ARIANRHOD.ElementNone"),
      fire: game.i18n.localize("ARIANRHOD.ElementFire"),
      water: game.i18n.localize("ARIANRHOD.ElementWater"),
      wind: game.i18n.localize("ARIANRHOD.ElementWind"),
      earth: game.i18n.localize("ARIANRHOD.ElementEarth"),
      light: game.i18n.localize("ARIANRHOD.ElementLight"),
      dark: game.i18n.localize("ARIANRHOD.ElementDark"),
    };

    // Resolve display fields
    const enemies = filtered.map(e => ({
      ...e,
      displayName: resolveLocalizedField(e, "name", lang),
      typeLabel: typeLabels[e.type] || e.type,
      elementLabel: e.element ? (elementLabels[e.element] || e.element) : "",
      categoryLabel: e.category === "mob"
        ? game.i18n.localize("ARIANRHOD.EnemyCategoryMob")
        : game.i18n.localize("ARIANRHOD.EnemyCategorySolo"),
      selected: e.id === this._selectedEnemyId,
    }));

    // Selected enemy preview
    let selectedEnemy = null;
    if (this._selectedEnemyId) {
      const raw = enemyLibrary.find(e => e.id === this._selectedEnemyId);
      if (raw) {
        selectedEnemy = {
          ...raw,
          displayName: resolveLocalizedField(raw, "name", lang),
          typeLabel: typeLabels[raw.type] || raw.type,
          elementLabel: raw.element ? (elementLabels[raw.element] || raw.element) : "",
          categoryLabel: raw.category === "mob"
            ? game.i18n.localize("ARIANRHOD.EnemyCategoryMob")
            : game.i18n.localize("ARIANRHOD.EnemyCategorySolo"),
        };
      }
    }

    // Available types and levels for filter dropdowns
    const types = getEnemyTypes().map(t => ({ value: t, label: typeLabels[t] || t }));
    const levels = getEnemyLevels().map(l => ({ value: l, label: `Lv.${l}` }));

    context.enemies = enemies;
    context.selectedEnemy = selectedEnemy;
    context.searchQuery = this._searchQuery;
    context.filterCategory = this._filterCategory;
    context.filterType = this._filterType;
    context.filterLevel = this._filterLevel;
    context.types = types;
    context.levels = levels;
    context.hasEnemies = enemies.length > 0;
    context.canCreateFromLibrary = selectedEnemy && !selectedEnemy.partial;

    return context;
  }

  static #onSelectEnemy(event, target) {
    const enemyId = target.dataset.enemyId;
    if (enemyId) {
      this._selectedEnemyId = enemyId;
      this.render();
    }
  }

  static async #onCreateFromLibrary(event, target) {
    event.preventDefault();
    if (!this._selectedEnemyId) return;

    const { enemyLibrary } = await import("../helpers/enemy-library.mjs");
    const enemy = enemyLibrary.find(e => e.id === this._selectedEnemyId);
    if (!enemy || enemy.partial) return;

    const lang = game.i18n.lang;
    const displayName = resolveLocalizedField(enemy, "name", lang);

    const actorData = {
      name: displayName,
      type: "enemy",
      system: {
        level: enemy.level,
        enemyType: enemy.category === "mob" ? "" : "boss",
        element: enemy.element || "none",
        exp: enemy.exp || 0,
        drops: enemy.drops || "",
        abilities: {
          str: { value: enemy.abilities?.str ?? 6 },
          dex: { value: enemy.abilities?.dex ?? 6 },
          agi: { value: enemy.abilities?.agi ?? 6 },
          int: { value: enemy.abilities?.int ?? 6 },
          sen: { value: enemy.abilities?.sen ?? 6 },
          men: { value: enemy.abilities?.men ?? 6 },
          luk: { value: enemy.abilities?.luk ?? 6 },
        },
        combat: {
          hp: { value: enemy.hp, max: enemy.hp },
          mp: { value: enemy.mp ?? 0, max: enemy.mp ?? 0 },
          physDef: enemy.combat.physDef,
          magDef: enemy.combat.magDef,
          initiative: enemy.combat.initiative,
          movement: enemy.combat.movement,
          accuracy: enemy.combat.accuracy,
          evasion: enemy.combat.evasion,
          attack: enemy.combat.attack,
          magAttack: 0,
        },
        tags: enemy.category,
        identifyDC: enemy.identifyDC ?? (8 + enemy.level * 2),
      },
      flags: {
        arianrhod2e: {
          fromLibrary: true,
          libraryId: enemy.id,
        },
      },
    };

    await Actor.create(actorData);
    ui.notifications.info(game.i18n.format("ARIANRHOD.EnemyCreatedFromLibrary", { name: displayName }));
    this.close();
  }

  static async #onCreateCustom(event, target) {
    event.preventDefault();
    const actorData = {
      name: this.initialData.name || game.i18n.localize("TYPES.Actor.enemy"),
      type: "enemy",
      flags: {
        arianrhod2e: {
          fromLibrary: true,
        },
      },
    };
    await Actor.create(actorData);
    this.close();
  }
}
