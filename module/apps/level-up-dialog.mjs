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
    if (field === "name") return skill.nameEn || skill.name;
    return skill[field];
  }
  if (lang === "en") {
    const enField = `${field}En`;
    if (skill[enField]) return skill[enField];
    return skill[field];
  }
  return skill[field];
}

/**
 * Level-Up Wizard Dialog - A 4-step wizard for character level advancement.
 *
 * Steps:
 *   1. Pattern Selection (A/B/C)
 *   2. Ability Selection (pick 3 different abilities for +1)
 *   3. Skill Selection (acquire/increase skills within budget)
 *   4. Summary & Confirm
 *
 * Rulebook reference: p.197-198
 */
export class LevelUpDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this._step = 1;
    this._pattern = null;
    this._selectedAbilities = new Set();
    this._skillSelections = []; // [{skillId, skillName, delta, isNew, itemId, maxLevel, currentLevel}]
    this._newSupportClass = null;
    this._searchQuery = "";
    this._searchTimeout = null;
    this._filterClass = "all";
  }

  static DEFAULT_OPTIONS = {
    id: "level-up-{id}",
    classes: ["arianrhod2e", "dialog", "level-up"],
    tag: "form",
    window: {
      title: "ARIANRHOD.LevelUpWizard",
      resizable: true,
      positioned: true,
    },
    position: {
      width: 720,
      height: 640,
    },
    actions: {
      selectPattern: LevelUpDialog.#onSelectPattern,
      toggleAbility: LevelUpDialog.#onToggleAbility,
      addSkillLevel: LevelUpDialog.#onAddSkillLevel,
      removeSkillLevel: LevelUpDialog.#onRemoveSkillLevel,
      nextStep: LevelUpDialog.#onNextStep,
      prevStep: LevelUpDialog.#onPrevStep,
      applyLevelUp: LevelUpDialog.#onApplyLevelUp,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/level-up-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.LevelUpWizard");
  }

  // --- Computed helpers ---

  /** Level-up cost in GP = current level before level-up */
  get _cost() {
    return this.actor.system.level;
  }

  /** New level after level-up */
  get _newLevel() {
    return this.actor.system.level + 1;
  }

  /** Skill budget based on pattern */
  get _skillBudget() {
    return this._pattern === "A" ? 3 : 2;
  }

  /** Total skill levels already allocated */
  get _skillLevelsAllocated() {
    return this._skillSelections.reduce((sum, s) => sum + s.delta, 0);
  }

  /** Remaining skill budget */
  get _skillBudgetRemaining() {
    return this._skillBudget - this._skillLevelsAllocated;
  }

  /** Fate increase for Pattern C */
  get _fateIncrease() {
    return Math.floor(this._newLevel / 10) + 1;
  }

  /** Whether the actor can afford the level-up */
  get _canAfford() {
    return this.actor.system.growthPoints.remaining >= this._cost;
  }

  // --- Event wiring ---

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;

    // Support class dropdown (Pattern B, Step 3)
    const supportClassSelect = html.querySelector("select.ar-levelup-support-class");
    if (supportClassSelect) {
      supportClassSelect.addEventListener("change", (event) => {
        this._newSupportClass = event.target.value;
        this.render();
      });
    }

    // Skill filter select (Step 3)
    const filterSelect = html.querySelector("select.ar-levelup-filter-class");
    if (filterSelect) {
      filterSelect.addEventListener("change", (event) => {
        this._filterClass = event.target.value;
        this.render();
      });
    }

    // Skill search input (Step 3)
    const searchInput = html.querySelector("input.ar-levelup-search");
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

  // --- Context ---

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    const sys = actor.system;
    const lang = game.i18n.lang;
    const config = CONFIG.ARIANRHOD;

    context.step = this._step;
    context.pattern = this._pattern;
    context.cost = this._cost;
    context.currentLevel = sys.level;
    context.newLevel = this._newLevel;
    context.canAfford = this._canAfford;
    context.gpRemaining = sys.growthPoints.remaining;

    // Step 1 — Pattern Selection
    if (this._step === 1) {
      context.patterns = [
        {
          key: "A",
          label: game.i18n.localize("ARIANRHOD.PatternA"),
          description: game.i18n.localize("ARIANRHOD.PatternADesc"),
          selected: this._pattern === "A",
        },
        {
          key: "B",
          label: game.i18n.localize("ARIANRHOD.PatternB"),
          description: game.i18n.localize("ARIANRHOD.PatternBDesc"),
          selected: this._pattern === "B",
        },
        {
          key: "C",
          label: game.i18n.localize("ARIANRHOD.PatternC"),
          description: game.i18n.localize("ARIANRHOD.PatternCDesc"),
          selected: this._pattern === "C",
        },
      ];
    }

    // Step 2 — Ability Selection
    if (this._step === 2) {
      context.abilities = [];
      for (const [key, labelKey] of Object.entries(config.abilities)) {
        const abbrKey = config.abilityAbbreviations[key];
        context.abilities.push({
          key,
          label: game.i18n.localize(labelKey),
          abbreviation: game.i18n.localize(abbrKey),
          current: sys.abilities[key].value,
          preview: sys.abilities[key].value + 1,
          selected: this._selectedAbilities.has(key),
        });
      }
      context.selectedCount = this._selectedAbilities.size;
    }

    // Step 3 — Skill Selection
    if (this._step === 3) {
      context.skillBudget = this._skillBudget;
      context.skillBudgetRemaining = this._skillBudgetRemaining;
      context.isPatternB = this._pattern === "B";
      context.isPatternC = this._pattern === "C";

      // Pattern B: support class change
      if (this._pattern === "B") {
        context.supportClassOptions = [];
        for (const [key, labelKey] of Object.entries(config.supportClasses)) {
          context.supportClassOptions.push({
            value: key,
            label: game.i18n.localize(labelKey),
            selected: (this._newSupportClass || sys.supportClass) === key,
          });
        }
        context.currentSupportClass = sys.supportClass
          ? game.i18n.localize(config.supportClasses[sys.supportClass])
          : "—";
        context.newSupportClass = this._newSupportClass;
      }

      // Pattern C: fate increase preview
      if (this._pattern === "C") {
        context.fateIncrease = this._fateIncrease;
        context.currentFate = sys.fate.max;
        context.newFateMax = sys.fate.max + this._fateIncrease;
      }

      // Build available skills list
      const skillLibrary = config.skillLibrary;
      const mainClass = sys.mainClass;
      // For Pattern B, use the new support class if chosen
      const supportClass = (this._pattern === "B" && this._newSupportClass)
        ? this._newSupportClass
        : sys.supportClass;

      let availableSkills = [...(skillLibrary.general || [])];
      if (mainClass && skillLibrary[mainClass]) {
        availableSkills = [...availableSkills, ...skillLibrary[mainClass]];
      }
      if (supportClass && skillLibrary[supportClass]) {
        availableSkills = [...availableSkills, ...skillLibrary[supportClass]];
      }

      // Deduplicate by skill id (in case main == support)
      const seen = new Set();
      availableSkills = availableSkills.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      // Actor's existing skills
      const existingSkills = actor.items.filter(i => i.type === "skill");
      const existingMap = new Map();
      for (const item of existingSkills) {
        const sid = item.getFlag("arianrhod2e", "skillId");
        if (sid) existingMap.set(sid, item);
      }

      // Build selection tracking map
      const selMap = new Map();
      for (const sel of this._skillSelections) {
        selMap.set(sel.skillId, sel);
      }

      // Apply filters
      let filteredSkills = availableSkills;
      const filterClass = this._filterClass || "all";
      if (filterClass !== "all") {
        filteredSkills = filteredSkills.filter(s => s.skillClass === filterClass);
      }
      if (this._searchQuery) {
        const query = this._searchQuery.toLowerCase();
        filteredSkills = filteredSkills.filter(s => {
          const dname = resolveLocalizedField(s, "name", lang);
          return dname.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query) ||
            (s.nameEn && s.nameEn.toLowerCase().includes(query));
        });
      }

      context.skills = filteredSkills.map(skill => {
        const displayName = resolveLocalizedField(skill, "name", lang);
        const displayNameSub = (lang === "ja")
          ? skill.nameEn
          : (displayName !== skill.name ? skill.name : skill.nameEn);
        const existing = existingMap.get(skill.id);
        const currentLevel = existing ? existing.system.level : 0;
        const sel = selMap.get(skill.id);
        const allocatedDelta = sel ? sel.delta : 0;
        const effectiveLevel = currentLevel + allocatedDelta;
        const maxLevel = skill.maxLevel || 1;
        // Can add more? Budget remaining > 0 AND not at max AND not +2 in this session
        const canAdd = this._skillBudgetRemaining > 0 && effectiveLevel < maxLevel && allocatedDelta < 2;
        const canRemove = allocatedDelta > 0;
        return {
          id: skill.id,
          displayName,
          displayNameSub,
          classLabel: skill.skillClass === "general"
            ? game.i18n.localize("ARIANRHOD.GeneralSkills")
            : game.i18n.localize(config.supportClasses[skill.skillClass] || config.mainClasses[skill.skillClass] || skill.skillClass),
          timingLabel: game.i18n.localize(config.skillTimings[skill.timing] || skill.timing),
          cost: skill.cost,
          maxLevel,
          currentLevel,
          allocatedDelta,
          effectiveLevel,
          canAdd,
          canRemove,
          isNew: !existing,
        };
      });

      // Filter options
      context.filterOptions = [
        { value: "all", label: game.i18n.localize("ARIANRHOD.AllSkills") },
        { value: "general", label: game.i18n.localize("ARIANRHOD.GeneralSkills") },
      ];
      if (mainClass) {
        context.filterOptions.push({
          value: mainClass,
          label: game.i18n.localize(config.mainClasses[mainClass]),
        });
      }
      if (supportClass && supportClass !== mainClass) {
        context.filterOptions.push({
          value: supportClass,
          label: game.i18n.localize(config.supportClasses[supportClass]),
        });
      }
      context.filterClass = filterClass;
      context.searchQuery = this._searchQuery;
    }

    // Step 4 — Summary
    if (this._step === 4) {
      context.summary = this._buildSummary();
    }

    // Step navigation
    context.canPrev = this._step > 1;
    context.canNext = this._step < 4 && this._validateCurrentStep();
    context.isFinalStep = this._step === 4;

    return context;
  }

  // --- Validation ---

  _validateCurrentStep() {
    switch (this._step) {
      case 1:
        return !!this._pattern && this._canAfford;
      case 2:
        return this._selectedAbilities.size === 3;
      case 3:
        return this._skillLevelsAllocated === this._skillBudget &&
          (this._pattern !== "B" || !!this._newSupportClass);
      default:
        return true;
    }
  }

  _buildSummary() {
    const sys = this.actor.system;
    const config = CONFIG.ARIANRHOD;
    const summary = {};

    summary.currentLevel = sys.level;
    summary.newLevel = this._newLevel;
    summary.pattern = this._pattern;
    summary.patternLabel = game.i18n.localize(`ARIANRHOD.Pattern${this._pattern}`);
    summary.cost = this._cost;
    summary.gpBefore = sys.growthPoints.remaining;
    summary.gpAfter = sys.growthPoints.remaining - this._cost;

    // Abilities
    summary.abilities = [];
    for (const key of this._selectedAbilities) {
      const labelKey = config.abilityAbbreviations[key];
      summary.abilities.push({
        label: game.i18n.localize(labelKey),
        before: sys.abilities[key].value,
        after: sys.abilities[key].value + 1,
      });
    }

    // Skills
    summary.skills = this._skillSelections.map(s => ({
      name: s.skillName,
      isNew: s.isNew,
      before: s.currentLevel,
      after: s.currentLevel + s.delta,
      delta: s.delta,
    }));

    // Pattern B: support class
    if (this._pattern === "B" && this._newSupportClass) {
      summary.supportClassChange = {
        before: sys.supportClass
          ? game.i18n.localize(config.supportClasses[sys.supportClass])
          : "—",
        after: game.i18n.localize(config.supportClasses[this._newSupportClass]),
      };
    }

    // Pattern C: fate
    if (this._pattern === "C") {
      summary.fateIncrease = {
        amount: this._fateIncrease,
        before: sys.fate.max,
        after: sys.fate.max + this._fateIncrease,
      };
    }

    return summary;
  }

  // --- Actions ---

  static #onSelectPattern(event, target) {
    event.preventDefault();
    const pattern = target.dataset.pattern;
    if (!pattern) return;
    this._pattern = pattern;
    // Reset downstream selections when pattern changes
    this._skillSelections = [];
    this._newSupportClass = null;
    this.render();
  }

  static #onToggleAbility(event, target) {
    event.preventDefault();
    const key = target.dataset.ability;
    if (!key) return;
    if (this._selectedAbilities.has(key)) {
      this._selectedAbilities.delete(key);
    } else if (this._selectedAbilities.size < 3) {
      this._selectedAbilities.add(key);
    }
    this.render();
  }

  static #onAddSkillLevel(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skillId;
    if (!skillId || this._skillBudgetRemaining <= 0) return;

    const existing = this._skillSelections.find(s => s.skillId === skillId);
    if (existing) {
      if (existing.delta >= 2) return; // Max 2 levels per skill per level-up
      existing.delta += 1;
    } else {
      // Find skill info
      const lang = game.i18n.lang;
      const skillLibrary = CONFIG.ARIANRHOD.skillLibrary;
      let skillData = null;
      for (const classKey in skillLibrary) {
        skillData = skillLibrary[classKey].find(s => s.id === skillId);
        if (skillData) break;
      }
      if (!skillData) return;

      const existingItem = this.actor.items.find(i =>
        i.type === "skill" && i.getFlag("arianrhod2e", "skillId") === skillId
      );
      const displayName = resolveLocalizedField(skillData, "name", lang);

      this._skillSelections.push({
        skillId,
        skillName: displayName,
        delta: 1,
        isNew: !existingItem,
        itemId: existingItem?.id ?? null,
        maxLevel: skillData.maxLevel || 1,
        currentLevel: existingItem ? existingItem.system.level : 0,
      });
    }
    this.render();
  }

  static #onRemoveSkillLevel(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skillId;
    if (!skillId) return;

    const idx = this._skillSelections.findIndex(s => s.skillId === skillId);
    if (idx === -1) return;

    const sel = this._skillSelections[idx];
    sel.delta -= 1;
    if (sel.delta <= 0) {
      this._skillSelections.splice(idx, 1);
    }
    this.render();
  }

  static #onNextStep(event, target) {
    event.preventDefault();
    if (!this._validateCurrentStep()) return;
    if (this._step < 4) {
      this._step += 1;
      this.render();
    }
  }

  static #onPrevStep(event, target) {
    event.preventDefault();
    if (this._step > 1) {
      this._step -= 1;
      this.render();
    }
  }

  static async #onApplyLevelUp(event, target) {
    event.preventDefault();
    if (!this._validateCurrentStep()) return;

    const actor = this.actor;
    const sys = actor.system;
    const lang = game.i18n.lang;
    const newLevel = this._newLevel;
    const cost = this._cost;

    // Build actor update
    const updates = {
      "system.level": newLevel,
      "system.growthPoints.spent": sys.growthPoints.spent + cost,
    };

    // Ability increases
    for (const key of this._selectedAbilities) {
      updates[`system.abilities.${key}.value`] = sys.abilities[key].value + 1;
    }

    // Pattern B: support class change
    if (this._pattern === "B" && this._newSupportClass) {
      updates["system.supportClass"] = this._newSupportClass;
    }

    // Pattern C: fate increase
    if (this._pattern === "C") {
      const fateIncrease = this._fateIncrease;
      updates["system.fate.max"] = sys.fate.max + fateIncrease;
      updates["system.fate.value"] = Math.min(sys.fate.value + fateIncrease, sys.fate.max + fateIncrease);
    }

    await actor.update(updates);

    // Create/update skill items
    for (const sel of this._skillSelections) {
      if (sel.isNew) {
        // Find skill data from library
        const skillLibrary = CONFIG.ARIANRHOD.skillLibrary;
        let skillData = null;
        for (const classKey in skillLibrary) {
          skillData = skillLibrary[classKey].find(s => s.id === sel.skillId);
          if (skillData) break;
        }
        if (!skillData) continue;

        const displayName = resolveLocalizedField(skillData, "name", lang);
        const displayDescription = resolveLocalizedField(skillData, "description", lang);
        const displayRange = resolveLocalizedField(skillData, "range", lang);
        const displayTarget = resolveLocalizedField(skillData, "target", lang);

        const itemData = {
          name: displayName,
          type: "skill",
          system: {
            description: displayDescription,
            skillClass: skillData.skillClass,
            level: sel.delta,
            maxLevel: skillData.maxLevel,
            timing: skillData.timing,
            target: displayTarget,
            range: displayRange,
            cost: skillData.cost,
            effect: displayDescription,
          },
          flags: {
            arianrhod2e: {
              skillId: skillData.id,
              nameJa: skillData.name,
              nameEn: skillData.nameEn,
            },
          },
        };
        await Item.create(itemData, { parent: actor });
      } else {
        // Update existing skill level
        const item = actor.items.get(sel.itemId);
        if (item) {
          await item.update({ "system.level": item.system.level + sel.delta });
        }
      }
    }

    // Add growth log entry
    const log = [...(sys.growthLog ?? [])];
    const config = CONFIG.ARIANRHOD;
    log.push({
      level: newLevel,
      abilities: [...this._selectedAbilities].map(k =>
        game.i18n.localize(config.abilityAbbreviations[k])
      ).join(", "),
      skills: this._skillSelections.map(s => s.skillName).join(", "),
      growthPts: cost,
      gold: 0,
      notes: `Pattern ${this._pattern}`,
    });
    await actor.update({ "system.growthLog": log });

    ui.notifications.info(game.i18n.format("ARIANRHOD.LevelUpSuccess", {
      name: actor.name,
      level: newLevel,
    }));

    this.close();
  }
}
