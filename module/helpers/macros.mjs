/**
 * Macros and Hotbar support for Arianrhod RPG 2E.
 *
 * Allows dragging items (skills, weapons) onto the hotbar to create quick-use macros.
 * Provides global functions for executing macros by item name.
 */

import { activateSkill } from "./skill-activation.mjs";

/**
 * Handle hotbarDrop hook — create a macro when an item is dropped on the hotbar.
 * @param {Hotbar} bar - The hotbar application
 * @param {object} data - The drop data
 * @param {number} slot - The hotbar slot number
 * @returns {Promise<boolean>|void} false to prevent default, or void to allow it
 */
export async function onHotbarDrop(bar, data, slot) {
  // Only handle Item drops from actors
  if (data.type !== "Item") return;

  const item = await fromUuid(data.uuid);
  if (!item) return;

  // Only handle items owned by an actor
  const actor = item.parent;
  if (!(actor instanceof Actor)) return;

  let command = "";
  let macroName = "";
  let img = item.img;

  switch (item.type) {
    case "skill":
      macroName = `${item.name}`;
      command = `game.arianrhod2e.macros.rollSkillMacro("${item.name}");`;
      break;
    case "weapon":
      macroName = `${item.name}`;
      command = `game.arianrhod2e.macros.rollAttackMacro("${item.name}");`;
      break;
    default:
      // For other item types, show the item sheet
      macroName = item.name;
      command = `game.arianrhod2e.macros.rollItemMacro("${item.name}", "${item.type}");`;
      break;
  }

  // Find or create the macro
  let macro = game.macros.find(m => m.name === macroName && m.command === command);
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: img || "icons/svg/dice-target.svg",
      command,
      flags: { "arianrhod2e": { itemName: item.name, itemType: item.type } },
    });
  }

  await game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Execute a skill macro by skill name.
 * Finds the skill on the current user's selected or assigned actor.
 * @param {string} skillName - The name of the skill item
 */
export async function rollSkillMacro(skillName) {
  const actor = _getMacroActor();
  if (!actor) return;

  const skill = actor.items.find(i => i.type === "skill" && i.name === skillName);
  if (!skill) {
    ui.notifications.warn(game.i18n.format("ARIANRHOD.MacroSkillNotFound", { name: skillName }));
    return;
  }

  await activateSkill(actor, skill);
}

/**
 * Execute an attack macro by weapon name.
 * Finds the weapon on the current user's actor and rolls an attack.
 * @param {string} weaponName - The name of the weapon item
 */
export async function rollAttackMacro(weaponName) {
  const actor = _getMacroActor();
  if (!actor) return;

  const weapon = actor.items.find(i => i.type === "weapon" && i.name === weaponName);
  if (!weapon) {
    ui.notifications.warn(game.i18n.format("ARIANRHOD.MacroWeaponNotFound", { name: weaponName }));
    return;
  }

  // Ensure the weapon is equipped before attacking
  if (!weapon.system.equipped) {
    ui.notifications.warn(game.i18n.format("ARIANRHOD.MacroWeaponNotEquipped", { name: weaponName }));
    return;
  }

  await actor.rollAttack();
}

/**
 * Execute a generic item macro by item name and type.
 * Opens the item sheet for the matched item.
 * @param {string} itemName - The name of the item
 * @param {string} itemType - The type of the item
 */
export async function rollItemMacro(itemName, itemType) {
  const actor = _getMacroActor();
  if (!actor) return;

  const item = actor.items.find(i => i.type === itemType && i.name === itemName);
  if (!item) {
    ui.notifications.warn(game.i18n.format("ARIANRHOD.MacroItemNotFound", { name: itemName }));
    return;
  }

  item.sheet.render(true);
}

/**
 * Create and execute an ability check macro.
 * @param {string} abilityKey - The ability key (str, dex, agi, int, sen, men, luk)
 */
export async function rollAbilityCheckMacro(abilityKey) {
  const actor = _getMacroActor();
  if (!actor) return;

  if (!actor.system.abilities?.[abilityKey]) {
    ui.notifications.warn(game.i18n.localize("ARIANRHOD.MacroNoActor"));
    return;
  }

  await actor.rollAbilityCheck(abilityKey);
}

/**
 * Get the actor for macro execution.
 * Priority: controlled token's actor → user's assigned character.
 * @returns {Actor|null}
 * @private
 */
function _getMacroActor() {
  const speaker = ChatMessage.getSpeaker();
  let actor;

  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  if (!actor) {
    ui.notifications.warn(game.i18n.localize("ARIANRHOD.MacroNoActor"));
    return null;
  }
  return actor;
}
