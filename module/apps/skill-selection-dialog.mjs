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
      filterClass: SkillSelectionDialog.#onFilterClass,
      search: SkillSelectionDialog.#onSearch,
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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

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

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredSkills = filteredSkills.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.nameEn.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    // Mark acquired skills and add localized timing
    filteredSkills = filteredSkills.map(skill => ({
      ...skill,
      acquired: acquiredSkillIds.includes(skill.id),
      timingLabel: game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[skill.timing] || skill.timing),
      classLabel: skill.skillClass === "general"
        ? game.i18n.localize("ARIANRHOD.GeneralSkills")
        : game.i18n.localize(CONFIG.ARIANRHOD.supportClasses[skill.skillClass] || skill.skillClass)
    }));

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

    // Create the skill item
    const itemData = {
      name: selectedSkill.name,
      type: "skill",
      system: {
        description: selectedSkill.description,
        skillClass: selectedSkill.skillClass,
        level: 1,
        maxLevel: selectedSkill.maxLevel,
        timing: selectedSkill.timing,
        target: selectedSkill.target,
        range: selectedSkill.range,
        cost: selectedSkill.cost,
        effect: selectedSkill.description
      },
      flags: {
        arianrhod2e: {
          skillId: selectedSkill.id,
          nameEn: selectedSkill.nameEn
        }
      }
    };

    await Item.create(itemData, { parent: this.actor });

    ui.notifications.info(game.i18n.format("ARIANRHOD.SkillAcquired", { name: selectedSkill.name }));

    // Close dialog or re-render
    this.render();
  }

  static #onFilterClass(event, target) {
    event.preventDefault();
    this._filterClass = target.value;
    this.render();
  }

  static #onSearch(event, target) {
    event.preventDefault();
    this._searchQuery = target.value;
    // Debounce search
    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      this.render();
    }, 300);
  }
}
