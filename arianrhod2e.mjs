/**
 * Arianrhod RPG 2E System for Foundry Virtual Tabletop
 * アリアンロッドRPG 2E
 *
 * A JRPG-style fantasy TRPG by F.E.A.R.
 */

import { ARIANRHOD } from "./module/helpers/config.mjs";
import { ArianrhodActor } from "./module/documents/actor.mjs";
import { ArianrhodItem } from "./module/documents/item.mjs";
import { ArianrhodActorSheet } from "./module/sheets/actor-sheet.mjs";
import { ArianrhodItemSheet } from "./module/sheets/item-sheet.mjs";
import { rollCheck, rollCheckDialog } from "./module/dice.mjs";

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
  };

  // Add system config to global CONFIG
  CONFIG.ARIANRHOD = ARIANRHOD;

  // Define custom Document classes
  CONFIG.Actor.documentClass = ArianrhodActor;
  CONFIG.Item.documentClass = ArianrhodItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("arianrhod2e", ArianrhodActorSheet, {
    makeDefault: true,
    label: "ARIANRHOD.SheetCharacter",
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("arianrhod2e", ArianrhodItemSheet, {
    makeDefault: true,
    label: "ARIANRHOD.SheetItem",
  });

  // Register Handlebars helpers
  _registerHandlebarsHelpers();

  // Preload Handlebars templates
  return _preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", () => {
  console.log("Arianrhod 2E | システム準備完了");
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

function _registerHandlebarsHelpers() {
  // Equality check helper
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  // Greater than helper
  Handlebars.registerHelper("gt", function (a, b) {
    return a > b;
  });

  // Multiplication helper
  Handlebars.registerHelper("multiply", function (a, b) {
    return a * b;
  });

  // Localize with fallback
  Handlebars.registerHelper("localizeOr", function (key, fallback) {
    const localized = game.i18n.localize(key);
    return localized !== key ? localized : fallback;
  });
}

/* -------------------------------------------- */
/*  Preload Templates                           */
/* -------------------------------------------- */

async function _preloadHandlebarsTemplates() {
  return loadTemplates([
    // Actor sheet partials
    "systems/arianrhod2e/templates/parts/actor-items.hbs",
    "systems/arianrhod2e/templates/parts/actor-skills.hbs",
  ]);
}
