/**
 * Resolve a localized field from an enemy skill data object.
 * Fallback chain: locale-specific → nameEn → base (Japanese).
 * @param {object} skill - Skill data object from the library
 * @param {string} field - Base field name (e.g. "name", "effect")
 * @param {string} lang - Current language code (e.g. "ko", "en", "ja")
 * @returns {string} The resolved field value
 */
function resolveLocalizedField(skill, field, lang) {
  if (lang === "ko") {
    const koField = `${field}Ko`;
    if (skill[koField]) return skill[koField];
    if (field === "name") {
      return skill.nameEn || skill.name;
    }
    return skill[field];
  }
  if (lang === "en") {
    const enField = `${field}En`;
    if (skill[enField]) return skill[enField];
    return skill[field];
  }
  // Default (ja): use base field
  return skill[field];
}

/**
 * Dialog for selecting enemy skills from the enemy skill library
 */
export class EnemySkillSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    id: "enemy-skill-selection-{id}",
    classes: ["arianrhod2e", "dialog", "skill-selection"],
    tag: "form",
    window: {
      title: "ARIANRHOD.EnemySkillSelection",
      resizable: true,
      positioned: true,
    },
    position: {
      width: 700,
      height: 600,
    },
    actions: {
      selectSkill: EnemySkillSelectionDialog.#onSelectSkill,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/enemy-skill-selection-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.EnemySkillSelection");
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // search input — input event with debounce
    const searchInput = html.querySelector('input.search-input');
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        this._searchQuery = event.target.value;
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
          this.render();
        }, 300);
      });
      // Restore focus to search input after re-render
      if (this._searchQuery) {
        searchInput.focus();
        searchInput.selectionStart = searchInput.selectionEnd = searchInput.value.length;
      }
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.config = CONFIG.ARIANRHOD;

    const lang = game.i18n.lang;
    const searchQuery = this._searchQuery || "";

    // Get enemy skill library
    const { enemySkillLibrary } = await import("../helpers/enemy-skill-library.mjs");

    // Get already acquired skills to mark them
    const acquiredSkillIds = this.actor.items
      .filter(i => i.type === "skill")
      .map(i => i.getFlag("arianrhod2e", "skillId"));

    // Apply search filter
    let filteredSkills = [...enemySkillLibrary];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredSkills = filteredSkills.filter(s => {
        const displayName = resolveLocalizedField(s, "name", lang);
        const displayEffect = resolveLocalizedField(s, "effect", lang);
        return displayName.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          (s.nameEn && s.nameEn.toLowerCase().includes(query)) ||
          displayEffect.toLowerCase().includes(query);
      });
    }

    // Resolve locale-appropriate display fields
    filteredSkills = filteredSkills.map(skill => {
      const displayName = resolveLocalizedField(skill, "name", lang);
      const displayNameSub = (lang === "ja")
        ? skill.nameEn
        : (displayName !== skill.name ? skill.name : skill.nameEn);
      return {
        ...skill,
        displayName,
        displayNameSub,
        displayEffect: resolveLocalizedField(skill, "effect", lang),
        timingLabel: game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[skill.timing] || skill.timing),
        slLimitLabel: skill.slLimit === 0 ? "—" : skill.slLimit,
        acquired: acquiredSkillIds.includes(skill.id),
      };
    });

    context.skills = filteredSkills;
    context.searchQuery = searchQuery;

    return context;
  }

  static async #onSelectSkill(event, target) {
    event.preventDefault();

    const skillId = target.dataset.skillId;
    if (!skillId) return;

    // Find the skill in the library
    const { enemySkillLibrary } = await import("../helpers/enemy-skill-library.mjs");
    const selectedSkill = enemySkillLibrary.find(s => s.id === skillId);

    if (!selectedSkill) {
      ui.notifications.error(game.i18n.localize("ARIANRHOD.SkillNotFound"));
      return;
    }

    // Check if already acquired
    const existingSkill = this.actor.items.find(i =>
      i.type === "skill" && i.getFlag("arianrhod2e", "skillId") === skillId
    );

    if (existingSkill) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.SkillAlreadyAcquired"));
      return;
    }

    // Resolve locale-appropriate fields for item creation
    const lang = game.i18n.lang;
    const displayName = resolveLocalizedField(selectedSkill, "name", lang);
    const displayEffect = resolveLocalizedField(selectedSkill, "effect", lang);

    // Create the skill item
    const itemData = {
      name: displayName,
      type: "skill",
      system: {
        description: displayEffect,
        skillClass: "enemy",
        level: 1,
        maxLevel: selectedSkill.slLimit || 5,
        timing: selectedSkill.timing,
        target: selectedSkill.target,
        range: selectedSkill.range,
        cost: selectedSkill.cost,
        effect: displayEffect
      },
      flags: {
        arianrhod2e: {
          skillId: selectedSkill.id,
          isEnemySkill: true,
          nameJa: selectedSkill.name,
          nameEn: selectedSkill.nameEn
        }
      }
    };

    await Item.create(itemData, { parent: this.actor });

    ui.notifications.info(game.i18n.format("ARIANRHOD.SkillAcquired", { name: displayName }));

    // Re-render to update acquired status
    this.render();
  }
}
