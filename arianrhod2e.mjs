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
import { populateAllPacks, resetPack } from "./module/helpers/compendium-populator.mjs";
import { onHotbarDrop, rollSkillMacro, rollAttackMacro, rollItemMacro, rollAbilityCheckMacro } from "./module/helpers/macros.mjs";

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

  // Register Token HUD enhancements
  registerTokenHUD();
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
      const actor = game.actors.get(actorId);
      if (!actor) return;
      await actor.rollDamage(weaponId, isCritical);
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

  // Auto-populate compendium packs on first load (GM only)
  if (game.user.isGM && !game.settings.get("arianrhod2e", "compendiumsPopulated")) {
    console.log("Arianrhod 2E | Populating compendium packs...");
    try {
      await populateAllPacks();
      await game.settings.set("arianrhod2e", "compendiumsPopulated", true);
    } catch (err) {
      console.error("Arianrhod 2E | Failed to populate compendiums:", err);
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
}
