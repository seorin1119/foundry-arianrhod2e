/**
 * Rule Guide Dialog - In-game reference for system workflows and mechanics.
 * Accessible to all users (not just GM).
 *
 * MAINTENANCE NOTE: When system logic, UI, or workflows change,
 * the corresponding i18n Guide*Steps keys must be updated in all 3 lang files.
 */

const GUIDE_TABS = [
  { id: "combat", labelKey: "ARIANRHOD.GuideCombatTab", icon: "fas fa-shield-halved" },
  { id: "nonCombat", labelKey: "ARIANRHOD.GuideNonCombatTab", icon: "fas fa-scroll" },
  { id: "progression", labelKey: "ARIANRHOD.GuideProgressionTab", icon: "fas fa-chart-line" },
  { id: "reference", labelKey: "ARIANRHOD.GuideReferenceTab", icon: "fas fa-book-open" },
];

const GUIDE_SECTIONS = {
  combat: [
    { id: "combatStart", icon: "fas fa-flag", titleKey: "ARIANRHOD.GuideCombatStart", contentKey: "ARIANRHOD.GuideCombatStartSteps" },
    { id: "attackFlow", icon: "fas fa-crosshairs", titleKey: "ARIANRHOD.GuideAttackFlow", contentKey: "ARIANRHOD.GuideAttackFlowSteps" },
    { id: "skillActivation", icon: "fas fa-bolt", titleKey: "ARIANRHOD.GuideSkillActivation", contentKey: "ARIANRHOD.GuideSkillActivationSteps" },
    { id: "skillPanel", icon: "fas fa-list-check", titleKey: "ARIANRHOD.GuideSkillPanel", contentKey: "ARIANRHOD.GuideSkillPanelSteps" },
    { id: "cover", icon: "fas fa-shield-heart", titleKey: "ARIANRHOD.GuideCover", contentKey: "ARIANRHOD.GuideCoverSteps" },
    { id: "identify", icon: "fas fa-eye", titleKey: "ARIANRHOD.GuideIdentify", contentKey: "ARIANRHOD.GuideIdentifySteps" },
    { id: "movement", icon: "fas fa-person-running", titleKey: "ARIANRHOD.GuideMovement", contentKey: "ARIANRHOD.GuideMovementSteps" },
    { id: "flightHidden", icon: "fas fa-feather", titleKey: "ARIANRHOD.GuideFlightHidden", contentKey: "ARIANRHOD.GuideFlightHiddenSteps" },
    { id: "dropItems", icon: "fas fa-hand-sparkles", titleKey: "ARIANRHOD.GuideDropItems", contentKey: "ARIANRHOD.GuideDropItemsSteps" },
  ],
  nonCombat: [
    { id: "situationCheck", icon: "fas fa-magnifying-glass", titleKey: "ARIANRHOD.GuideSituationCheck", contentKey: "ARIANRHOD.GuideSituationCheckSteps" },
    { id: "fsJudgment", icon: "fas fa-star", titleKey: "ARIANRHOD.GuideFSJudgment", contentKey: "ARIANRHOD.GuideFSJudgmentSteps" },
    { id: "trap", icon: "fas fa-dungeon", titleKey: "ARIANRHOD.GuideTrap", contentKey: "ARIANRHOD.GuideTrapSteps" },
    { id: "abilityCheck", icon: "fas fa-dice", titleKey: "ARIANRHOD.GuideAbilityCheck", contentKey: "ARIANRHOD.GuideAbilityCheckSteps" },
    { id: "rest", icon: "fas fa-bed", titleKey: "ARIANRHOD.GuideRest", contentKey: "ARIANRHOD.GuideRestSteps" },
    { id: "consumable", icon: "fas fa-flask", titleKey: "ARIANRHOD.GuideConsumable", contentKey: "ARIANRHOD.GuideConsumableSteps" },
    { id: "itemShop", icon: "fas fa-store", titleKey: "ARIANRHOD.GuideItemShop", contentKey: "ARIANRHOD.GuideItemShopSteps" },
  ],
  progression: [
    { id: "levelUp", icon: "fas fa-arrow-up", titleKey: "ARIANRHOD.GuideLevelUp", contentKey: "ARIANRHOD.GuideLevelUpSteps" },
    { id: "sessionEnd", icon: "fas fa-flag-checkered", titleKey: "ARIANRHOD.GuideSessionEnd", contentKey: "ARIANRHOD.GuideSessionEndSteps" },
  ],
  reference: [
    { id: "statusEffects", icon: "fas fa-skull-crossbones", titleKey: "ARIANRHOD.GuideStatusEffects", contentKey: "ARIANRHOD.GuideStatusEffectsContent" },
    { id: "elements", icon: "fas fa-fire", titleKey: "ARIANRHOD.GuideElements", contentKey: "ARIANRHOD.GuideElementsContent" },
    { id: "racePassive", icon: "fas fa-dna", titleKey: "ARIANRHOD.GuideRacePassive", contentKey: "ARIANRHOD.GuideRacePassiveContent" },
    { id: "guildSupport", icon: "fas fa-shield-heart", titleKey: "ARIANRHOD.GuideGuildSupport", contentKey: "ARIANRHOD.GuideGuildSupportContent" },
  ],
};

export class RuleGuideDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options = {}) {
    super(options);
    this._activeTab = "combat";
  }

  static DEFAULT_OPTIONS = {
    id: "rule-guide",
    classes: ["arianrhod2e", "dialog", "rule-guide"],
    window: {
      title: "ARIANRHOD.RuleGuide",
      resizable: true,
    },
    position: {
      width: 640,
      height: 560,
    },
    actions: {
      switchTab: RuleGuideDialog.#onSwitchTab,
    },
  };

  static PARTS = {
    body: {
      template: "systems/arianrhod2e/templates/apps/rule-guide.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.RuleGuide");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.tabs = GUIDE_TABS.map(tab => ({
      ...tab,
      label: game.i18n.localize(tab.labelKey),
      active: tab.id === this._activeTab,
    }));

    context.tabContents = GUIDE_TABS.map(tab => ({
      id: tab.id,
      active: tab.id === this._activeTab,
      sections: (GUIDE_SECTIONS[tab.id] || []).map(section => ({
        ...section,
        title: game.i18n.localize(section.titleKey),
        content: game.i18n.localize(section.contentKey),
      })),
    }));

    return context;
  }

  static #onSwitchTab(event, target) {
    const tab = target.dataset.tab;
    if (!tab) return;
    this._activeTab = tab;

    const html = this.element;
    html.querySelectorAll(".ar-guide-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    html.querySelectorAll(".ar-guide-panel").forEach(panel => {
      panel.style.display = panel.dataset.tab === tab ? "" : "none";
    });
  }
}
