/**
 * FS Setup Dialog - GM tool for managing Favorable Situation (FS) judgment sessions.
 * Rulebook reference: p.250-253 (FS Judgment / 有利な状況判定)
 *
 * Phases:
 * - Setup: Configure DC, completion target, max rounds, support check DC
 * - Progress: Track PC checks, FS events per round, progress toward goal
 *
 * FS Events Table (1D6, p.252):
 * 1: Enemy Appearance
 * 2: Injury (random PC loses 1D6 HP)
 * 3-4: No Change
 * 5: Good Fortune (progress +1)
 * 6: Great Discovery (progress +2)
 */

import { rollFSCheck } from "../dice.mjs";

export class FSSetupDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(options = {}) {
    super(options);
    this._phase = "setup";
    this._fsData = {};
    this._checkedThisRound = new Set();
  }

  static DEFAULT_OPTIONS = {
    id: "fs-setup-dialog",
    classes: ["arianrhod2e", "dialog", "fs-setup"],
    tag: "form",
    window: {
      title: "ARIANRHOD.FSSetup",
      resizable: true,
    },
    position: {
      width: 500,
      height: 500,
    },
    actions: {
      startFS: FSSetupDialog.#onStartFS,
      rollCheck: FSSetupDialog.#onRollCheck,
      nextRound: FSSetupDialog.#onNextRound,
      endFS: FSSetupDialog.#onEndFS,
    },
  };

  static PARTS = {
    form: {
      template: "systems/arianrhod2e/templates/apps/fs-setup-dialog.hbs",
    },
  };

  get title() {
    return game.i18n.localize("ARIANRHOD.FSSetup");
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.phase = this._phase;

    if (this._phase === "setup") {
      context.defaultDC = 11;
      context.defaultTarget = 10;
      context.defaultMaxRounds = 5;
      context.defaultSupportDC = 11;
    } else {
      // Progress phase
      const d = this._fsData;
      context.difficulty = d.difficulty;
      context.completionTarget = d.completionTarget;
      context.maxRounds = d.maxRounds;
      context.supportDC = d.supportDC;
      context.currentRound = d.currentRound;
      context.progress = d.progress;
      context.progressPct = Math.min(100, Math.round((d.progress / d.completionTarget) * 100));
      context.isComplete = d.progress >= d.completionTarget;
      context.isLastRound = d.currentRound >= d.maxRounds;

      // Get PCs
      const pcs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
      context.pcs = pcs.map(a => ({
        id: a.id,
        name: a.name,
        img: a.img,
        level: a.system.level ?? 1,
        checked: this._checkedThisRound.has(a.id),
      }));
      context.hasPCs = context.pcs.length > 0;

      // Ability choices for FS check
      context.abilities = [
        { key: "str", label: game.i18n.localize("ARIANRHOD.AbilityStr") },
        { key: "dex", label: game.i18n.localize("ARIANRHOD.AbilityDex") },
        { key: "agi", label: game.i18n.localize("ARIANRHOD.AbilityAgi") },
        { key: "int", label: game.i18n.localize("ARIANRHOD.AbilityInt") },
        { key: "sen", label: game.i18n.localize("ARIANRHOD.AbilitySen") },
        { key: "men", label: game.i18n.localize("ARIANRHOD.AbilityMen") },
        { key: "luk", label: game.i18n.localize("ARIANRHOD.AbilityLuk") },
      ];
    }

    return context;
  }

  /**
   * Start the FS session.
   */
  static #onStartFS(event, target) {
    event.preventDefault();
    const form = this.element;

    const difficulty = parseInt(form.querySelector('[name="difficulty"]')?.value) || 11;
    const completionTarget = parseInt(form.querySelector('[name="completionTarget"]')?.value) || 10;
    const maxRounds = parseInt(form.querySelector('[name="maxRounds"]')?.value) || 5;
    const supportDC = parseInt(form.querySelector('[name="supportDC"]')?.value) || 11;

    this._fsData = {
      difficulty,
      completionTarget,
      maxRounds,
      supportDC,
      currentRound: 1,
      progress: 0,
    };
    this._phase = "progress";
    this._checkedThisRound = new Set();

    // Persist to world setting
    game.settings.set("arianrhod2e", "fsSession", { ...this._fsData });

    // Post start message to chat
    ChatMessage.create({
      content: `<div class="ar-combat-card ar-fs-card">
        <div class="ar-card-row"><strong><i class="fas fa-star"></i> ${game.i18n.localize("ARIANRHOD.FSSetup")}</strong></div>
        <div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.FSDifficulty")}</span><span class="ar-card-value">${difficulty}</span></div>
        <div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.FSCompletionTarget")}</span><span class="ar-card-value">${completionTarget}</span></div>
        <div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.FSMaxRounds")}</span><span class="ar-card-value">${maxRounds}</span></div>
      </div>`,
      speaker: { alias: game.i18n.localize("ARIANRHOD.SystemName") },
    });

    this.render(true);
  }

  /**
   * Roll an FS check for a specific PC.
   */
  static async #onRollCheck(event, target) {
    event.preventDefault();
    const actorId = target.dataset.actorId;
    if (!actorId) return;

    const actor = game.actors.get(actorId);
    if (!actor) return;

    // Get ability selection from the corresponding row
    const row = target.closest(".ar-fs-pc-row");
    const abilityKey = row?.querySelector('[name="ability"]')?.value || "str";
    const abilityBonus = actor.system.abilities?.[abilityKey]?.bonus ?? 0;

    const result = await rollFSCheck({
      modifier: abilityBonus,
      difficulty: this._fsData.difficulty,
      currentProgress: this._fsData.progress,
      completionTarget: this._fsData.completionTarget,
      actor,
      label: `${game.i18n.localize("ARIANRHOD.FSRollCheck")} — ${actor.name}`,
    });

    // Update progress
    this._fsData.progress = Math.max(0, result.total);
    this._checkedThisRound.add(actorId);

    // Persist
    game.settings.set("arianrhod2e", "fsSession", { ...this._fsData });

    this.render(true);
  }

  /**
   * Advance to the next round and roll a 1D6 FS event.
   */
  static async #onNextRound(event, target) {
    event.preventDefault();

    // Roll 1D6 FS event
    const eventRoll = new Roll("1d6");
    await eventRoll.evaluate();
    const eventResult = eventRoll.total;

    let eventContent = "";
    let eventIcon = "";

    switch (eventResult) {
      case 1: {
        // Enemy Appearance
        eventIcon = "fas fa-skull-crossbones";
        eventContent = game.i18n.localize("ARIANRHOD.FSEventEnemy");
        break;
      }
      case 2: {
        // Injury - random PC loses 1D6 HP
        const pcs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
        if (pcs.length > 0) {
          const randomPC = pcs[Math.floor(Math.random() * pcs.length)];
          const dmgRoll = new Roll("1d6");
          await dmgRoll.evaluate();
          const damage = dmgRoll.total;

          // Apply damage
          const currentHP = randomPC.system.combat?.hp?.value ?? 0;
          await randomPC.update({ "system.combat.hp.value": Math.max(0, currentHP - damage) });

          eventIcon = "fas fa-heart-crack";
          eventContent = game.i18n.format("ARIANRHOD.FSEventInjury", { name: randomPC.name, damage });
        } else {
          eventIcon = "fas fa-heart-crack";
          eventContent = game.i18n.localize("ARIANRHOD.FSEventNothing");
        }
        break;
      }
      case 3:
      case 4: {
        // No Change
        eventIcon = "fas fa-minus-circle";
        eventContent = game.i18n.localize("ARIANRHOD.FSEventNothing");
        break;
      }
      case 5: {
        // Good Fortune - progress +1
        this._fsData.progress = Math.max(0, this._fsData.progress + 1);
        eventIcon = "fas fa-clover";
        eventContent = game.i18n.localize("ARIANRHOD.FSEventFortune");
        break;
      }
      case 6: {
        // Great Discovery - progress +2
        this._fsData.progress = Math.max(0, this._fsData.progress + 2);
        eventIcon = "fas fa-gem";
        eventContent = game.i18n.localize("ARIANRHOD.FSEventDiscovery");
        break;
      }
    }

    // Post event to chat
    await eventRoll.toMessage({
      speaker: { alias: game.i18n.localize("ARIANRHOD.SystemName") },
      flavor: `<i class="fas fa-star"></i> ${game.i18n.localize("ARIANRHOD.FSEventRoll")}`,
      content: `<div class="ar-combat-card ar-fs-card">
        <div class="ar-card-row"><i class="${eventIcon}"></i> <strong>[${eventResult}]</strong> ${eventContent}</div>
        <div class="ar-fs-progress-bar">
          <div class="ar-fs-progress-fill" style="width: ${Math.min(100, Math.round((this._fsData.progress / this._fsData.completionTarget) * 100))}%"></div>
          <span class="ar-fs-progress-text">${this._fsData.progress} / ${this._fsData.completionTarget}</span>
        </div>
      </div>`,
    });

    // Advance round
    this._fsData.currentRound++;
    this._checkedThisRound = new Set();

    // Persist
    game.settings.set("arianrhod2e", "fsSession", { ...this._fsData });

    this.render(true);
  }

  /**
   * End the FS session and post result.
   */
  static async #onEndFS(event, target) {
    event.preventDefault();

    const success = this._fsData.progress >= this._fsData.completionTarget;
    const resultLabel = success
      ? game.i18n.localize("ARIANRHOD.FSSuccess")
      : game.i18n.localize("ARIANRHOD.FSFailure");
    const resultClass = success ? "ar-critical" : "ar-fumble";
    const resultIcon = success ? "fas fa-trophy" : "fas fa-times-circle";

    const pct = Math.min(100, Math.round((this._fsData.progress / this._fsData.completionTarget) * 100));

    await ChatMessage.create({
      content: `<div class="ar-combat-card ar-fs-card">
        <div class="ar-card-row"><strong><i class="fas fa-star"></i> ${game.i18n.localize("ARIANRHOD.FSJudgment")}</strong></div>
        <div class="ar-fs-progress-bar">
          <div class="ar-fs-progress-fill" style="width: ${pct}%"></div>
          <span class="ar-fs-progress-text">${this._fsData.progress} / ${this._fsData.completionTarget}</span>
        </div>
        <div class="ar-card-row ar-card-final">
          <span class="${resultClass}"><i class="${resultIcon}"></i> ${resultLabel}</span>
        </div>
      </div>`,
      speaker: { alias: game.i18n.localize("ARIANRHOD.SystemName") },
    });

    // Clear persisted data
    game.settings.set("arianrhod2e", "fsSession", {});

    // Reset dialog to setup phase
    this._phase = "setup";
    this._fsData = {};
    this._checkedThisRound = new Set();

    this.close();
  }
}
