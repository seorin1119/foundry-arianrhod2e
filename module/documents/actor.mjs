/**
 * Extend the base Actor document for Arianrhod RPG 2E.
 * Derived data is handled by DataModel classes in data/actor-data.mjs.
 * @extends {Actor}
 */
export class ArianrhodActor extends Actor {
  /**
   * Roll an ability check (2d6 + ability bonus).
   * @param {string} abilityKey - The ability key (str, dex, agi, int, per, spi, luk)
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
}
