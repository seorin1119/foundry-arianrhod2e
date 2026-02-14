import { rollCheckDialog } from "../dice.mjs";

/**
 * Extend the base Actor document for Arianrhod RPG 2E.
 * Derived data is handled by DataModel classes in data/actor-data.mjs.
 * @extends {Actor}
 */
export class ArianrhodActor extends Actor {
  /**
   * Roll an ability check (2d6 + ability bonus).
   * @param {string} abilityKey - The ability key (str, dex, agi, int, sen, men, luk)
   * @param {object} options - Roll options
   * @returns {Promise<Roll>}
   */
  async rollAbilityCheck(abilityKey, options = {}) {
    const ability = this.system.abilities[abilityKey];
    if (!ability) return;

    const label = game.i18n.localize(
      CONFIG.ARIANRHOD.abilities[abilityKey] ?? abilityKey
    );
    const bonus = ability.bonus;

    const roll = new Roll("2d6 + @bonus", { bonus });
    await roll.evaluate();

    // Check for critical (2+ sixes) and fumble (2+ ones)
    const dice = roll.dice[0].results.map((r) => r.result);
    const sixCount = dice.filter((d) => d === 6).length;
    const oneCount = dice.filter((d) => d === 1).length;

    let flavor = `${label} チェック`;
    if (sixCount >= 2) {
      flavor += ` — <strong>クリティカル!</strong>`;
    } else if (oneCount >= 2) {
      flavor += " — <strong>ファンブル!</strong>";
    }

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: flavor,
      ...options,
    });

    return roll;
  }

  /**
   * Roll an attack check (2d6 + accuracy).
   * @param {object} options - Roll options
   * @returns {Promise<Roll|null>}
   */
  async rollAttack(options = {}) {
    const systemData = this.system;
    const equippedWeapons = this.items.filter(i => i.type === "weapon" && i.system.equipped);

    if (equippedWeapons.length === 0) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoWeaponEquipped"));
      return null;
    }

    let weapon = equippedWeapons[0];
    if (equippedWeapons.length > 1) {
      weapon = await this._selectWeapon(equippedWeapons);
      if (!weapon) return null;
    }

    const accuracy = systemData.combat?.accuracy ?? 0;
    const maxFate = this.type === "character" ? (systemData.fate?.value ?? 0) : 0;

    return rollCheckDialog({
      title: `${game.i18n.localize("ARIANRHOD.AttackRoll")} (${weapon.name})`,
      modifier: accuracy,
      maxFate: maxFate,
      label: `${game.i18n.localize("ARIANRHOD.AttackRoll")} — ${weapon.name}`,
      actor: this,
    });
  }

  /**
   * Post damage as a chat message (damage in Arianrhod is flat, not rolled).
   * @param {string} [weaponId] - Specific weapon ID, or use first equipped weapon
   * @returns {Promise<void>}
   */
  async rollDamage(weaponId) {
    const weapon = weaponId
      ? this.items.get(weaponId)
      : this.items.find(i => i.type === "weapon" && i.system.equipped);
    if (!weapon) return null;

    const damage = weapon.system.attack ?? 0;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="arianrhod damage-card">
        <h3>${game.i18n.localize("ARIANRHOD.DamageRoll")}</h3>
        <div class="damage-weapon">${weapon.name}</div>
        <div class="damage-value">${damage}</div>
      </div>`,
    });
  }

  /**
   * Roll an evasion check (2d6 + evasion).
   * @param {object} options - Roll options
   * @returns {Promise<Roll|null>}
   */
  async rollEvasion(options = {}) {
    const evasion = this.system.combat?.evasion ?? 0;
    const maxFate = this.type === "character" ? (this.system.fate?.value ?? 0) : 0;

    return rollCheckDialog({
      title: game.i18n.localize("ARIANRHOD.EvasionRoll"),
      modifier: evasion,
      maxFate: maxFate,
      label: game.i18n.localize("ARIANRHOD.EvasionRoll"),
      actor: this,
    });
  }

  /**
   * Prompt user to select a weapon from multiple equipped weapons.
   * @param {Item[]} weapons - Array of equipped weapon items
   * @returns {Promise<Item|null>}
   */
  async _selectWeapon(weapons) {
    const options = weapons.map(w =>
      `<option value="${w.id}">${w.name} (${game.i18n.localize("ARIANRHOD.Attack")}: ${w.system.attack})</option>`
    ).join("");

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("ARIANRHOD.SelectWeapon") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("ARIANRHOD.SelectWeapon")}</label><select name="weaponId">${options}</select></div></form>`,
      ok: {
        label: game.i18n.localize("ARIANRHOD.Confirm"),
        callback: (event, button, dialog) => {
          return button.form.querySelector('[name="weaponId"]').value;
        }
      },
      rejectClose: false,
    });

    return result ? this.items.get(result) : null;
  }
}
