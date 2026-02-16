/**
 * Arianrhod RPG 2E System for Foundry Virtual Tabletop
 * アリアンロッドRPG 2E
 *
 * A JRPG-style fantasy TRPG by F.E.A.R.
 * Compatible with Foundry VTT v13+
 */

import { ARIANRHOD } from "./module/helpers/config.mjs";
import { ArianrhodActor } from "./module/documents/actor.mjs";
import { ArianrhodItem } from "./module/documents/item.mjs";
import { ArianrhodActorSheet } from "./module/sheets/actor-sheet.mjs";
import { ArianrhodItemSheet } from "./module/sheets/item-sheet.mjs";
import { CharacterData, EnemyData, GuildData } from "./module/data/actor-data.mjs";
import { ArianrhodGuildSheet } from "./module/sheets/guild-sheet.mjs";
import { WeaponData, ArmorData, AccessoryData, SkillData, ItemData, TrapData } from "./module/data/item-data.mjs";
import { ArianrhodCombat } from "./module/documents/combat.mjs";
import { rollCheck, rollCheckDialog, rollFSCheck, calculateFSProgress } from "./module/dice.mjs";
import { getStatusEffects } from "./module/helpers/status-effects.mjs";
import { registerTokenHUD } from "./module/helpers/token-hud.mjs";
import { populateAllPacks, resetPack, needsRepopulation } from "./module/helpers/compendium-populator.mjs";
import { onHotbarDrop, rollSkillMacro, rollAttackMacro, rollItemMacro, rollAbilityCheckMacro } from "./module/helpers/macros.mjs";
import { getMovementOptions, executeMovement } from "./module/helpers/movement.mjs";
import { createEngagement, removeFromEngagement, getEngagements, getOpponents } from "./module/helpers/engagement.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log("Arianrhod 2E | アリアンロッドRPG 2E システムを初期化中...");

  // Store reference for convenience
  game.arianrhod2e = {
    ArianrhodActor,
    ArianrhodItem,
    rollCheck,
    rollCheckDialog,
    rollFSCheck,
    calculateFSProgress,
    populateAllPacks,
    resetPack,
    macros: {
      rollSkillMacro,
      rollAttackMacro,
      rollItemMacro,
      rollAbilityCheckMacro,
    },
    combat: {
      getMovementOptions,
      executeMovement,
      createEngagement,
      removeFromEngagement,
      getEngagements,
      getOpponents,
    },
    async openSessionEnd() {
      if (!game.user.isGM) {
        ui.notifications.warn("GM only");
        return;
      }
      const { SessionEndDialog } = await import("./module/apps/session-end-dialog.mjs");
      new SessionEndDialog().render(true);
    },
  };

  // Add system config to global CONFIG
  CONFIG.ARIANRHOD = ARIANRHOD;

  // Define custom Document classes
  CONFIG.Actor.documentClass = ArianrhodActor;
  CONFIG.Item.documentClass = ArianrhodItem;
  CONFIG.Combat.documentClass = ArianrhodCombat;

  // Register status effects
  CONFIG.statusEffects = getStatusEffects();
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Initiative: static value, no roll (行動値)
  CONFIG.Combat.initiative = {
    formula: "@combat.initiative",
    decimals: 0
  };

  // Register DataModel classes for Actor types
  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterData,
    enemy: EnemyData,
    guild: GuildData,
  });

  // Register DataModel classes for Item types
  Object.assign(CONFIG.Item.dataModels, {
    weapon: WeaponData,
    armor: ArmorData,
    accessory: AccessoryData,
    skill: SkillData,
    item: ItemData,
    trap: TrapData,
  });

  // Register trackable attributes for token bars
  CONFIG.Actor.trackableAttributes = {
    character: {
      bar: ["combat.hp", "combat.mp", "fate"],
      value: ["level", "experience", "currency"],
    },
    enemy: {
      bar: ["combat.hp", "combat.mp"],
      value: ["level", "exp"],
    },
    guild: {
      bar: [],
      value: ["guildLevel", "gold"],
    },
  };

  // Register sheet application classes (v13 pattern)
  DocumentSheetConfig.registerSheet(Actor, "arianrhod2e", ArianrhodActorSheet, {
    makeDefault: true,
    label: "ARIANRHOD.SheetCharacter",
  });

  DocumentSheetConfig.registerSheet(Actor, "arianrhod2e", ArianrhodGuildSheet, {
    types: ["guild"],
    makeDefault: true,
    label: "ARIANRHOD.SheetGuild",
  });

  DocumentSheetConfig.registerSheet(Item, "arianrhod2e", ArianrhodItemSheet, {
    makeDefault: true,
    label: "ARIANRHOD.SheetItem",
  });

  // Register Handlebars helpers
  _registerHandlebarsHelpers();

  // Register system migration version setting
  game.settings.register("arianrhod2e", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

  // Register compendium population setting (GM only)
  game.settings.register("arianrhod2e", "compendiumsPopulated", {
    name: "Compendiums Populated",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Register compendium version for icon-based repopulation
  game.settings.register("arianrhod2e", "compendiumVersion", {
    name: "Compendium Version",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  // ---- System Settings (House Rules) ----

  game.settings.register("arianrhod2e", "criticalRange", {
    name: "ARIANRHOD.SettingCriticalRange",
    hint: "ARIANRHOD.SettingCriticalRangeHint",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    choices: {
      2: "ARIANRHOD.SettingCriticalDefault",
      1: "ARIANRHOD.SettingCriticalEasy",
    },
  });

  game.settings.register("arianrhod2e", "fateEnabled", {
    name: "ARIANRHOD.SettingFateEnabled",
    hint: "ARIANRHOD.SettingFateEnabledHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("arianrhod2e", "autoDamageCalc", {
    name: "ARIANRHOD.SettingAutoDamageCalc",
    hint: "ARIANRHOD.SettingAutoDamageCalcHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("arianrhod2e", "autoIncapacitation", {
    name: "ARIANRHOD.SettingAutoIncapacitation",
    hint: "ARIANRHOD.SettingAutoIncapacitationHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("arianrhod2e", "initiativeVariant", {
    name: "ARIANRHOD.SettingInitiativeVariant",
    hint: "ARIANRHOD.SettingInitiativeVariantHint",
    scope: "world",
    config: true,
    type: String,
    default: "static",
    choices: {
      static: "ARIANRHOD.SettingInitiativeStatic",
      roll: "ARIANRHOD.SettingInitiativeRoll",
    },
  });

  game.settings.register("arianrhod2e", "actionEconomyEnabled", {
    name: "ARIANRHOD.SettingActionEconomy",
    hint: "ARIANRHOD.SettingActionEconomyHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("arianrhod2e", "engagementEnabled", {
    name: "ARIANRHOD.SettingEngagement",
    hint: "ARIANRHOD.SettingEngagementHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Register Token HUD enhancements
  registerTokenHUD();
});

/* -------------------------------------------- */
/*  Scene Control Buttons (GM Tools)           */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user?.isGM) return;
  const tokenControls = controls.find(c => c.name === "token");
  if (tokenControls) {
    tokenControls.tools.push({
      name: "sessionEnd",
      title: "ARIANRHOD.SessionEnd",
      icon: "fas fa-flag-checkered",
      button: true,
      onClick: () => game.arianrhod2e.openSessionEnd(),
    });
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

Hooks.on("hotbarDrop", (bar, data, slot) => onHotbarDrop(bar, data, slot));

/* -------------------------------------------- */
/*  Chat Card Button Handlers                  */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", (message, html) => {
  // In Foundry v13, html may be a jQuery object, HTMLElement, or HTMLCollection
  const el = html instanceof HTMLElement ? html
    : html?.jquery ? html[0]
    : html?.[0] instanceof HTMLElement ? html[0]
    : null;
  if (!el?.querySelectorAll) return;

  // "Roll Damage" button on attack cards
  el.querySelectorAll(".ar-damage-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const actorId = btn.dataset.actorId;
      const weaponId = btn.dataset.weaponId;
      const isCritical = btn.dataset.critical === "true";
      const sixCount = parseInt(btn.dataset.sixCount) || 0;
      const actor = game.actors.get(actorId);
      if (!actor) return;
      await actor.rollDamage(weaponId, isCritical, sixCount);
    });
  });

  // "Fate Re-roll" button on attack cards
  el.querySelectorAll(".ar-reroll-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const actorId = btn.dataset.actorId;
      const formula = btn.dataset.formula;
      const baseDice = parseInt(btn.dataset.baseDice) || 2;
      const actor = game.actors.get(actorId);
      if (!actor || actor.type !== "character") return;

      // Check fate availability
      const currentFate = actor.system.fate?.value ?? 0;
      if (currentFate <= 0) {
        ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoFateRemaining"));
        return;
      }

      // Deduct 1 fate point
      await actor.update({ "system.fate.value": currentFate - 1 });

      // Re-roll with the same formula
      const { analyzeRoll } = await import("./module/dice.mjs");
      const roll = new Roll(formula);
      await roll.evaluate();
      const { isCritical, isFumble, sixCount } = analyzeRoll(roll, 0);

      // Find weapon info from original button
      const weaponId = btn.dataset.weaponId;
      const weapon = weaponId ? actor.items.get(weaponId) : actor.items.find(i => i.type === "weapon" && i.system.equipped);

      const content = await renderTemplate("systems/arianrhod2e/templates/chat/attack-card.hbs", {
        weaponImg: weapon?.img || actor.img || "icons/svg/sword.svg",
        weaponName: weapon?.name || game.i18n.localize("ARIANRHOD.NaturalAttack"),
        total: roll.total,
        isCritical,
        isFumble,
        sixCount,
        fateDice: 0,
        fateNotice: "",
        actorId,
        weaponId: weaponId || "",
        isReroll: true,
        canReroll: false,
        formula,
        baseDice,
      });

      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        content,
      });

      // Disable the re-roll button after use
      btn.disabled = true;
      btn.textContent = game.i18n.localize("ARIANRHOD.FateRerolled");
    });
  });

  // "Apply Damage" button on damage cards
  el.querySelectorAll(".ar-apply-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const targetId = btn.dataset.targetId;
      const damage = parseInt(btn.dataset.damage) || 0;
      const targetActor = game.actors.get(targetId);
      if (!targetActor) return;
      await targetActor.applyDamage(damage);
      ui.notifications.info(game.i18n.format("ARIANRHOD.DamageApplied", { name: targetActor.name, damage }));
      btn.disabled = true;
      btn.textContent = game.i18n.localize("ARIANRHOD.DamageAppliedShort");
    });
  });

  // "Cover" button on damage cards — redirect damage to covering ally (rulebook p.226)
  el.querySelectorAll(".ar-cover-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const { getEngagedWith } = await import("./module/helpers/engagement.mjs");

      const targetId = btn.dataset.targetId;
      const damage = parseInt(btn.dataset.damage) || 0;
      const rawDamage = parseInt(btn.dataset.rawDamage) || damage;
      const targetActor = game.actors.get(targetId);
      if (!targetActor || !game.combat?.started) return;

      // Find eligible coverers: same engagement, same side, not mob enemies
      const targetCombatant = game.combat.combatants.find(c => c.actor?.id === targetActor.id);
      if (!targetCombatant) return;

      const engagedIds = getEngagedWith(game.combat, targetCombatant.id);
      const coverers = engagedIds
        .map(id => game.combat.combatants.get(id))
        .filter(c => c?.actor && c.actor.id !== targetActor.id && c.actor.type === targetActor.type)
        .map(c => c.actor);

      if (coverers.length === 0) {
        ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoCovererAvailable"));
        return;
      }

      // Dialog to select coverer
      const choices = coverers.map(a => `<option value="${a.id}">${a.name} (HP: ${a.system.combat?.hp?.value}/${a.system.combat?.hp?.max})</option>`).join("");
      const selectContent = `<form>
        <div class="form-group">
          <label>${game.i18n.localize("ARIANRHOD.SelectCoverer")}</label>
          <select name="covererId">${choices}</select>
        </div>
      </form>`;

      const coverResult = await foundry.applications.api.DialogV2.prompt({
        window: { title: game.i18n.localize("ARIANRHOD.Cover") },
        content: selectContent,
        ok: {
          icon: "fas fa-shield-heart",
          label: game.i18n.localize("ARIANRHOD.Cover"),
          callback: (event, button) => ({
            covererId: button.form.querySelector('[name="covererId"]').value,
          }),
        },
        rejectClose: false,
      });
      if (!coverResult) return;

      const covererActor = game.actors.get(coverResult.covererId);
      if (!covererActor) return;

      // Recalculate damage with coverer's defense
      const covererPhysDef = covererActor.system.combat?.physDef ?? 0;
      const covererDamage = Math.max(0, rawDamage - covererPhysDef);

      // Apply damage to coverer
      await covererActor.applyDamage(covererDamage);

      // Post cover notification
      await ChatMessage.create({
        content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-cover"><i class="fas fa-shield-heart"></i> ${game.i18n.format("ARIANRHOD.CoverApplied", { coverer: covererActor.name, target: targetActor.name, damage: covererDamage })}</div></div>`,
        speaker: ChatMessage.getSpeaker({ actor: covererActor }),
      });

      // Disable both apply and cover buttons
      btn.disabled = true;
      const applyBtn = btn.parentElement?.querySelector(".ar-apply-btn");
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.textContent = game.i18n.localize("ARIANRHOD.CoveredShort");
      }
    });
  });

  // "Trap Detect" / "Trap Disarm" buttons on trap cards
  el.querySelectorAll(".ar-trap-detect-btn, .ar-trap-disarm-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const dc = parseInt(btn.dataset.dc) || 0;
      const isDetect = btn.classList.contains("ar-trap-detect-btn");
      const checkType = isDetect ? "trapDetect" : "trapDisarm";
      const label = isDetect
        ? game.i18n.localize("ARIANRHOD.TrapDetect")
        : game.i18n.localize("ARIANRHOD.TrapDisarm");

      // Get selected token's actor or first owned character
      const speaker = ChatMessage.getSpeaker();
      const actor = game.actors.get(speaker.actor);
      if (!actor) {
        ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoActorSelected"));
        return;
      }

      // Roll the check with difficulty
      const { rollCheckDialog } = await import("./module/dice.mjs");
      const checkKey = isDetect ? "sen" : "dex";
      const ability = actor.system.abilities?.[checkKey];
      const bonus = ability?.bonus ?? 0;
      await rollCheckDialog({
        actor,
        baseDice: 2,
        modifier: bonus,
        label: `${label} — ${actor.name}`,
        difficulty: dc,
      });
    });
  });

  // "Roll Evasion" button on attack cards — performs evasion + hit determination
  el.querySelectorAll(".ar-evasion-btn").forEach(btn => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const { analyzeRoll } = await import("./module/dice.mjs");
      const { isSurprised } = await import("./module/helpers/combat-manager.mjs");

      const targetId = btn.dataset.targetId;
      const attackerId = btn.dataset.attackerId;
      const weaponId = btn.dataset.weaponId;
      const attackTotal = parseInt(btn.dataset.attackTotal) || 0;
      const attackCritical = btn.dataset.isCritical === "true";
      const attackFumble = btn.dataset.isFumble === "true";
      const sixCount = parseInt(btn.dataset.sixCount) || 0;

      const targetActor = game.actors.get(targetId);
      const attackerActor = game.actors.get(attackerId);
      if (!targetActor) return;

      // Calculate evasion dice and penalties
      const evasion = targetActor.system.combat?.evasion ?? 0;
      let baseDice = 2;
      const penalties = [];
      if (targetActor.hasStatusEffect?.("stun")) {
        baseDice -= 1;
        penalties.push(game.i18n.localize("ARIANRHOD.StatusStun") + " (-1D)");
      }
      if (isSurprised(targetActor)) {
        const hasAlertness = targetActor.items?.some(i => i.type === "skill" && i.system?.effectId === "alertness");
        if (!hasAlertness) {
          baseDice -= 1;
          penalties.push(game.i18n.localize("ARIANRHOD.SurpriseAttack") + " (-1D)");
        }
      }
      baseDice = Math.max(1, baseDice);

      // Show evasion dialog
      const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
      const maxFate = (fateEnabled && targetActor.type === "character")
        ? Math.min(targetActor.system.fate?.value ?? 0, targetActor.system.abilities?.luk?.bonus ?? 0)
        : 0;

      const dicePenaltyNote = penalties.length > 0 ? penalties.join(", ") : "";
      const penaltyHtml = dicePenaltyNote
        ? `<div class="form-group" style="color:#dc2626;font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> ${dicePenaltyNote}</div>`
        : "";
      const dialogContent = `<form>${penaltyHtml}
        <div class="form-group">
          <label>${game.i18n.localize("ARIANRHOD.Modifier")}</label>
          <input type="number" name="modifier" value="${evasion}" />
        </div>
        ${maxFate > 0 ? `<div class="form-group">
          <label>${game.i18n.localize("ARIANRHOD.FateDice")} (${game.i18n.localize("ARIANRHOD.Max")}: ${maxFate})</label>
          <input type="number" name="fateDice" value="0" min="0" max="${maxFate}" />
        </div>` : ""}
      </form>`;

      const result = await foundry.applications.api.DialogV2.prompt({
        window: { title: `${game.i18n.localize("ARIANRHOD.EvasionRoll")} — ${targetActor.name}` },
        content: dialogContent,
        ok: {
          icon: "fas fa-shield-halved",
          label: game.i18n.localize("ARIANRHOD.Roll"),
          callback: (event, button) => {
            const form = button.form;
            return {
              modifier: parseInt(form.querySelector('[name="modifier"]').value) || 0,
              fateDice: Math.min(parseInt(form.querySelector('[name="fateDice"]')?.value) || 0, maxFate),
            };
          },
        },
        rejectClose: false,
      });
      if (!result) return;

      // Deduct fate
      if (result.fateDice > 0 && targetActor.type === "character") {
        await targetActor.update({ "system.fate.value": Math.max(0, targetActor.system.fate.value - result.fateDice) });
      }

      // Build and evaluate evasion roll
      let evasionFormula = `${baseDice}d6`;
      if (result.modifier > 0) evasionFormula += ` + ${result.modifier}`;
      else if (result.modifier < 0) evasionFormula += ` - ${Math.abs(result.modifier)}`;
      if (result.fateDice > 0) evasionFormula += ` + ${result.fateDice}d6`;

      const evasionRoll = new Roll(evasionFormula);
      await evasionRoll.evaluate();
      const evasionAnalysis = analyzeRoll(evasionRoll, result.fateDice);

      // Determine hit/miss with defender priority (rulebook p.204, p.224)
      // Fumble = achievement 0; tie = defender wins; both critical = defender wins
      const effectiveAttack = attackFumble ? 0 : attackTotal;
      const effectiveEvasion = evasionAnalysis.isFumble ? 0 : evasionRoll.total;
      let isHit;
      let reason = "";

      if (attackFumble) {
        isHit = false;
        reason = game.i18n.localize("ARIANRHOD.Fumble");
      } else if (evasionAnalysis.isFumble) {
        isHit = true;
      } else if (attackCritical && evasionAnalysis.isCritical) {
        // Both critical → defender priority → miss
        isHit = false;
        reason = game.i18n.localize("ARIANRHOD.DefenderPriority");
      } else if (effectiveAttack > effectiveEvasion) {
        isHit = true;
      } else {
        // Tie or evasion higher → defender wins
        isHit = false;
        if (effectiveAttack === effectiveEvasion) {
          reason = game.i18n.localize("ARIANRHOD.DefenderPriority");
        }
      }

      const evasionFateNotice = result.fateDice > 0
        ? game.i18n.format("ARIANRHOD.FateUsed", { count: result.fateDice })
        : "";

      // Render hit determination card
      const HIT_RESULT_TEMPLATE = "systems/arianrhod2e/templates/chat/hit-result-card.hbs";
      const hitContent = await renderTemplate(HIT_RESULT_TEMPLATE, {
        attackerName: attackerActor?.name ?? "???",
        targetName: targetActor.name,
        attackTotal: effectiveAttack,
        evasionTotal: effectiveEvasion,
        attackCritical,
        attackFumble,
        evasionCritical: evasionAnalysis.isCritical,
        evasionFumble: evasionAnalysis.isFumble,
        isHit,
        reason,
        attackerId,
        targetId,
        weaponId,
        sixCount,
        evasionFateNotice,
      });

      await evasionRoll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: targetActor }),
        content: hitContent,
      });

      // Disable evasion button after use
      btn.disabled = true;
      btn.textContent = isHit
        ? game.i18n.localize("ARIANRHOD.Hit")
        : game.i18n.localize("ARIANRHOD.Miss");
    });
  });
});

/* -------------------------------------------- */
/*  Ready Hook                                 */
/* -------------------------------------------- */

Hooks.once("ready", async () => {
  console.log("Arianrhod 2E | システム準備完了");

  // Apply initiative variant setting
  const initVariant = game.settings.get("arianrhod2e", "initiativeVariant");
  if (initVariant === "roll") {
    CONFIG.Combat.initiative = {
      formula: "2d6 + @combat.initiative",
      decimals: 0,
    };
  }

  // Run system migrations if needed
  const currentVersion = game.settings.get("arianrhod2e", "systemMigrationVersion");
  const NEEDS_MIGRATION_VERSION = "0.3.0";

  if (foundry.utils.isNewerVersion(NEEDS_MIGRATION_VERSION, currentVersion)) {
    console.log(`Arianrhod 2E | Running migration from ${currentVersion} to ${NEEDS_MIGRATION_VERSION}`);
    ui.notifications.info("Arianrhod 2E: Migrating actor data (PER→SEN, SPI→MEN). Please wait...", { permanent: false });

    await migrateAbilityNames();

    await game.settings.set("arianrhod2e", "systemMigrationVersion", NEEDS_MIGRATION_VERSION);
    console.log("Arianrhod 2E | Migration complete");
    ui.notifications.info("Arianrhod 2E: Migration complete!", { permanent: false });
  }

  // Auto-populate compendium packs on first load or when version changes (GM only)
  if (game.user.isGM) {
    const shouldPopulate = !game.settings.get("arianrhod2e", "compendiumsPopulated") || needsRepopulation();
    if (shouldPopulate) {
      console.log("Arianrhod 2E | Populating compendium packs...");
      try {
        await populateAllPacks();
        await game.settings.set("arianrhod2e", "compendiumsPopulated", true);
      } catch (err) {
        console.error("Arianrhod 2E | Failed to populate compendiums:", err);
      }
    }
  }
});

/* -------------------------------------------- */
/*  Migration Functions                         */
/* -------------------------------------------- */

/**
 * Migrate ability names from PER/SPI to SEN/MEN (v0.3.0)
 * Handles both world actors and unlinked scene tokens
 */
async function migrateAbilityNames() {
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];

  // Migrate world actors
  for (const actor of game.actors) {
    try {
      const updated = await migrateActorAbilities(actor);
      if (updated) migratedCount++;
      else skippedCount++;
    } catch (error) {
      errorCount++;
      errors.push({ type: "Actor", name: actor.name, id: actor.id, error: error.message });
      console.error(`Arianrhod 2E | Failed to migrate actor ${actor.name}:`, error);
    }
  }

  // Migrate unlinked tokens in scenes
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink) continue; // Skip linked tokens (they use world actor data)

      try {
        const actorData = token.delta?.system || token.actor?.system;
        if (!actorData?.abilities) continue;

        // Check if migration is needed
        if (actorData.abilities.sen || actorData.abilities.men) {
          skippedCount++;
          continue;
        }

        if (!actorData.abilities.per && !actorData.abilities.spi) {
          skippedCount++;
          continue;
        }

        // Migrate the token's actor data
        const updates = {};
        if (actorData.abilities.per) {
          updates["delta.system.abilities.sen"] = actorData.abilities.per;
          updates["delta.system.abilities.-=per"] = null;
        }
        if (actorData.abilities.spi) {
          updates["delta.system.abilities.men"] = actorData.abilities.spi;
          updates["delta.system.abilities.-=spi"] = null;
        }

        await token.update(updates);
        migratedCount++;
      } catch (error) {
        errorCount++;
        errors.push({ type: "Token", name: token.name, id: token.id, scene: scene.name, error: error.message });
        console.error(`Arianrhod 2E | Failed to migrate token ${token.name} in scene ${scene.name}:`, error);
      }
    }
  }

  // Log results
  console.log(`Arianrhod 2E | Migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`);

  if (errors.length > 0) {
    console.warn("Arianrhod 2E | Migration errors:", errors);
    ui.notifications.warn(`Migration completed with ${errorCount} errors. Check console for details.`);
  }

  return { migratedCount, skippedCount, errorCount, errors };
}

/**
 * Migrate a single actor's abilities from PER/SPI to SEN/MEN
 * @param {Actor} actor - The actor to migrate
 * @returns {boolean} - True if migrated, false if skipped
 */
async function migrateActorAbilities(actor) {
  const abilities = actor.system.abilities;
  if (!abilities) return false;

  // Check if already migrated (has sen/men fields)
  if (abilities.sen || abilities.men) {
    return false; // Already migrated
  }

  // Check if migration is needed (has per/spi fields)
  if (!abilities.per && !abilities.spi) {
    return false; // Nothing to migrate
  }

  // Prepare update data
  const updates = {};

  if (abilities.per) {
    updates["system.abilities.sen"] = abilities.per;
    updates["system.abilities.-=per"] = null;
  }

  if (abilities.spi) {
    updates["system.abilities.men"] = abilities.spi;
    updates["system.abilities.-=spi"] = null;
  }

  // Apply the update
  await actor.update(updates);
  console.log(`Arianrhod 2E | Migrated actor: ${actor.name}`);
  return true;
}

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

function _registerHandlebarsHelpers() {
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  Handlebars.registerHelper("gt", function (a, b) {
    return a > b;
  });

  Handlebars.registerHelper("multiply", function (a, b) {
    return a * b;
  });

  Handlebars.registerHelper("or", function (...args) {
    // Last argument is the Handlebars options hash
    args.pop();
    return args.some(Boolean);
  });
}
