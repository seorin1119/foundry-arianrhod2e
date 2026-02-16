/**
 * Situation Check Dialog - GM tool for non-combat checks.
 * Covers three types of checks from the rulebook:
 * - Gather Information (p.237): [SEN] or GM-chosen ability
 * - Negotiate (p.237): [MEN] opposed or DC check
 * - Appraise Item (p.237): [INT] check, no retry on failure
 */
export class SituationCheckDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options = {}) {
    super(options);
    this._activeTab = "gatherInfo";
  }

  static DEFAULT_OPTIONS = {
    id: "situation-check-dialog",
    classes: ["arianrhod2e", "dialog", "situation-check"],
    tag: "form",
    window: {
      title: "ARIANRHOD.SituationCheck",
      resizable: true,
    },
    position: {
      width: 520,
      height: 460,
    },
    actions: {
      switchTab: SituationCheckDialog.#onSwitchTab,
      setDC: SituationCheckDialog.#onSetDC,
      rollCheck: SituationCheckDialog.#onRollCheck,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/situation-check-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.SituationCheck");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Get player-owned characters
    const pcs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
    context.pcs = pcs.map(a => ({
      id: a.id,
      name: a.name,
      img: a.img,
      level: a.system.level ?? 1,
    }));
    context.hasPCs = context.pcs.length > 0;
    context.activeTab = this._activeTab;

    // Ability choices
    context.abilities = [
      { key: "str", label: game.i18n.localize("ARIANRHOD.AbilityStr") },
      { key: "dex", label: game.i18n.localize("ARIANRHOD.AbilityDex") },
      { key: "agi", label: game.i18n.localize("ARIANRHOD.AbilityAgi") },
      { key: "int", label: game.i18n.localize("ARIANRHOD.AbilityInt") },
      { key: "sen", label: game.i18n.localize("ARIANRHOD.AbilitySen") },
      { key: "men", label: game.i18n.localize("ARIANRHOD.AbilityMen") },
      { key: "luk", label: game.i18n.localize("ARIANRHOD.AbilityLuk") },
    ];

    // DC presets for gather information
    context.gatherPresets = [
      { dc: 10, label: game.i18n.localize("ARIANRHOD.GatherInfoDC10") },
      { dc: 12, label: game.i18n.localize("ARIANRHOD.GatherInfoDC12") },
      { dc: 14, label: game.i18n.localize("ARIANRHOD.GatherInfoDC14") },
      { dc: 16, label: game.i18n.localize("ARIANRHOD.GatherInfoDC16") },
      { dc: 20, label: game.i18n.localize("ARIANRHOD.GatherInfoDC20") },
    ];

    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    // Highlight active tab
    const html = this.element;
    html.querySelectorAll(".ar-sc-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === this._activeTab);
    });
    // Show/hide tab panels
    html.querySelectorAll(".ar-sc-tab-panel").forEach(panel => {
      panel.style.display = panel.dataset.tab === this._activeTab ? "" : "none";
    });
  }

  /**
   * Switch active tab.
   */
  static #onSwitchTab(event, target) {
    const tab = target.dataset.tab;
    if (!tab) return;
    this._activeTab = tab;

    const html = this.element;
    html.querySelectorAll(".ar-sc-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    html.querySelectorAll(".ar-sc-tab-panel").forEach(panel => {
      panel.style.display = panel.dataset.tab === tab ? "" : "none";
    });
  }

  /**
   * Set DC from preset button.
   */
  static #onSetDC(event, target) {
    const dc = target.dataset.dc;
    if (!dc) return;
    const dcInput = this.element.querySelector('.ar-sc-tab-panel[data-tab="gatherInfo"] [name="dc"]');
    if (dcInput) dcInput.value = dc;
  }

  /**
   * Execute the check for the selected PC.
   */
  static async #onRollCheck(event, target) {
    event.preventDefault();
    const html = this.element;
    const tab = this._activeTab;

    // Get selected PC
    const pcSelect = html.querySelector(`[name="pc-${tab}"]`);
    const actorId = pcSelect?.value;
    if (!actorId) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoActorSelected"));
      return;
    }
    const actor = game.actors.get(actorId);
    if (!actor) return;

    // Get ability and DC based on tab
    let abilityKey, dc, label;

    if (tab === "gatherInfo") {
      abilityKey = html.querySelector('[name="ability-gatherInfo"]')?.value || "sen";
      dc = parseInt(html.querySelector('.ar-sc-tab-panel[data-tab="gatherInfo"] [name="dc"]')?.value) || null;
      label = `${game.i18n.localize("ARIANRHOD.GatherInfo")} — ${actor.name}`;
    } else if (tab === "negotiate") {
      abilityKey = "men";
      dc = parseInt(html.querySelector('.ar-sc-tab-panel[data-tab="negotiate"] [name="dc"]')?.value) || null;
      label = `${game.i18n.localize("ARIANRHOD.Negotiate")} — ${actor.name}`;
    } else if (tab === "appraise") {
      abilityKey = "int";
      dc = parseInt(html.querySelector('.ar-sc-tab-panel[data-tab="appraise"] [name="dc"]')?.value) || null;
      label = `${game.i18n.localize("ARIANRHOD.Appraise")} — ${actor.name}`;
    }

    const abilityBonus = actor.system.abilities?.[abilityKey]?.bonus ?? 0;

    // Compute max fate for the character
    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    const maxFate = (fateEnabled && actor.type === "character")
      ? Math.min(actor.system.fate?.value ?? 0, actor.system.abilities?.luk?.bonus ?? 0)
      : 0;

    const { rollCheckDialog } = await import("../dice.mjs");
    await rollCheckDialog({
      title: label,
      modifier: abilityBonus,
      maxFate,
      difficulty: dc,
      label,
      actor,
      baseDice: 2,
    });
  }
}
