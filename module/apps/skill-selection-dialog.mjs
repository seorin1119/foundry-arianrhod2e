/**
 * Resolve a localized field from a skill data object.
 * Fallback chain: locale-specific → nameEn → base (Japanese).
 * @param {object} skill - Skill data object from the library
 * @param {string} field - Base field name (e.g. "name", "description", "range", "target")
 * @param {string} lang - Current language code (e.g. "ko", "en", "ja")
 * @returns {string} The resolved field value
 */
function resolveLocalizedField(skill, field, lang) {
  if (lang === "ko") {
    const koField = `${field}Ko`;
    if (skill[koField]) return skill[koField];
    // For name, fall back to English before Japanese
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
 * Dialog for selecting skills from the skill library
 */
export class SkillSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = {
    id: "skill-selection-{id}",
    classes: ["arianrhod2e", "dialog", "skill-selection"],
    tag: "form",
    window: {
      title: "ARIANRHOD.SkillSelection",
      resizable: true,
      positioned: true,
    },
    position: {
      width: 700,
      height: 600,
    },
    actions: {
      selectSkill: SkillSelectionDialog.#onSelectSkill,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/skill-selection-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.SkillSelection");
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // filterClass select — change event (NOT data-action, which fires on click and re-renders immediately)
    const filterSelect = html.querySelector('select.filter-class-select');
    if (filterSelect) {
      filterSelect.addEventListener("change", (event) => {
        this._filterClass = event.target.value;
        this.render();
      });
    }

    // search input — input event with debounce (NOT data-action)
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

    // Current locale for field resolution
    const lang = game.i18n.lang;

    // Get character's classes
    const mainClass = this.actor.system.mainClass;
    const supportClass = this.actor.system.supportClass;

    // Get all available skills
    const skillLibrary = CONFIG.ARIANRHOD.skillLibrary;

    // Combine available skills based on character classes
    let availableSkills = [...skillLibrary.general];

    if (mainClass && skillLibrary[mainClass]) {
      availableSkills = [...availableSkills, ...skillLibrary[mainClass]];
    }

    if (supportClass && skillLibrary[supportClass]) {
      availableSkills = [...availableSkills, ...skillLibrary[supportClass]];
    }

    // Get already acquired skills to mark them
    const acquiredSkillIds = this.actor.items
      .filter(i => i.type === "skill")
      .map(i => i.getFlag("arianrhod2e", "skillId"));

    // Apply filter if stored
    const filterClass = this._filterClass || "all";
    const searchQuery = this._searchQuery || "";

    let filteredSkills = availableSkills;

    // Apply class filter
    if (filterClass !== "all") {
      filteredSkills = filteredSkills.filter(s => s.skillClass === filterClass);
    }

    // Apply search filter (search across all locale variants)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredSkills = filteredSkills.filter(s => {
        const displayName = resolveLocalizedField(s, "name", lang);
        const displayDesc = resolveLocalizedField(s, "description", lang);
        return displayName.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          (s.nameEn && s.nameEn.toLowerCase().includes(query)) ||
          displayDesc.toLowerCase().includes(query);
      });
    }

    // Mark acquired skills and resolve locale-appropriate display fields
    filteredSkills = filteredSkills.map(skill => {
      const displayName = resolveLocalizedField(skill, "name", lang);
      // Subtitle: show alternate name when primary differs from original
      // ja → show English name; en/ko → show Japanese original
      const displayNameSub = (lang === "ja")
        ? skill.nameEn
        : (displayName !== skill.name ? skill.name : skill.nameEn);
      return {
        ...skill,
        displayName,
        displayNameSub,
        displayDescription: resolveLocalizedField(skill, "description", lang),
        displayRange: game.i18n.localize(CONFIG.ARIANRHOD.rangeMap?.[skill.range] ?? skill.range),
        displayTarget: game.i18n.localize(CONFIG.ARIANRHOD.targetMap?.[skill.target] ?? skill.target),
        acquired: acquiredSkillIds.includes(skill.id),
        timingLabel: game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[skill.timing] || skill.timing),
        classLabel: skill.skillClass === "general"
          ? game.i18n.localize("ARIANRHOD.GeneralSkills")
          : game.i18n.localize(CONFIG.ARIANRHOD.supportClasses[skill.skillClass] || skill.skillClass)
      };
    });

    context.skills = filteredSkills;
    context.hasMainClass = !!mainClass;
    context.hasSupportClass = !!supportClass;
    context.mainClass = mainClass;
    context.supportClass = supportClass;
    context.filterClass = filterClass;
    context.searchQuery = searchQuery;

    // Available filter options
    context.filterOptions = [
      { value: "all", label: game.i18n.localize("ARIANRHOD.AllSkills") },
      { value: "general", label: game.i18n.localize("ARIANRHOD.GeneralSkills") },
    ];

    if (mainClass) {
      context.filterOptions.push({
        value: mainClass,
        label: game.i18n.localize(CONFIG.ARIANRHOD.mainClasses[mainClass])
      });
    }

    if (supportClass && supportClass !== mainClass) {
      context.filterOptions.push({
        value: supportClass,
        label: game.i18n.localize(CONFIG.ARIANRHOD.supportClasses[supportClass])
      });
    }

    return context;
  }

  static async #onSelectSkill(event, target) {
    event.preventDefault();

    const skillId = target.dataset.skillId;
    if (!skillId) return;

    // Find the skill in the library
    const skillLibrary = CONFIG.ARIANRHOD.skillLibrary;
    let selectedSkill = null;

    for (const classKey in skillLibrary) {
      const skills = skillLibrary[classKey];
      selectedSkill = skills.find(s => s.id === skillId);
      if (selectedSkill) break;
    }

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
    const displayDescription = resolveLocalizedField(selectedSkill, "description", lang);
    const displayRange = resolveLocalizedField(selectedSkill, "range", lang);
    const displayTarget = resolveLocalizedField(selectedSkill, "target", lang);

    // Create the skill item with locale-appropriate display values
    const itemData = {
      name: displayName,
      type: "skill",
      system: {
        description: displayDescription,
        skillClass: selectedSkill.skillClass,
        level: 1,
        maxLevel: selectedSkill.maxLevel,
        timing: selectedSkill.timing,
        target: displayTarget,
        range: displayRange,
        cost: selectedSkill.cost,
        effect: displayDescription
      },
      flags: {
        arianrhod2e: {
          skillId: selectedSkill.id,
          nameJa: selectedSkill.name,
          nameEn: selectedSkill.nameEn
        }
      }
    };

    await Item.create(itemData, { parent: this.actor });

    ui.notifications.info(game.i18n.format("ARIANRHOD.SkillAcquired", { name: displayName }));

    // Close dialog or re-render
    this.render();
  }

}
