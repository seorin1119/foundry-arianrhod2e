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
import { CharacterData, EnemyData } from "./module/data/actor-data.mjs";
import { WeaponData, ArmorData, AccessoryData, SkillData, ItemData } from "./module/data/item-data.mjs";
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

  // Register DataModel classes for Actor types
  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterData,
    enemy: EnemyData,
  });

  // Register DataModel classes for Item types
  Object.assign(CONFIG.Item.dataModels, {
    weapon: WeaponData,
    armor: ArmorData,
    accessory: AccessoryData,
    skill: SkillData,
    item: ItemData,
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
  };

  // Register sheet application classes (v13 pattern)
  DocumentSheetConfig.registerSheet(Actor, "arianrhod2e", ArianrhodActorSheet, {
    makeDefault: true,
    label: "ARIANRHOD.SheetCharacter",
  });

  DocumentSheetConfig.registerSheet(Item, "arianrhod2e", ArianrhodItemSheet, {
    makeDefault: true,
    label: "ARIANRHOD.SheetItem",
  });

  // Register Handlebars helpers
  _registerHandlebarsHelpers();
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
