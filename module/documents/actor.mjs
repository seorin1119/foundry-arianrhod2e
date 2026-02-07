/**
 * Extend the base Actor document for Arianrhod RPG 2E.
 * @extends {Actor}
 */
export class ArianrhodActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    const systemData = this.system;

    // Calculate ability bonuses (能力ボーナス = 能力基本値 / 3, rounded down)
    if (systemData.abilities) {
      for (const [key, ability] of Object.entries(systemData.abilities)) {
        ability.bonus = Math.floor(ability.value / 3);
      }
    }

    // Type-specific derived data
    if (this.type === "character") {
      this._prepareCharacterData(systemData);
    } else if (this.type === "enemy") {
      this._prepareEnemyData(systemData);
    }
  }

  /**
   * Prepare derived data for character actors.
   * @param {object} systemData
   */
  _prepareCharacterData(systemData) {
    // Ensure HP and MP don't exceed max
    systemData.combat.hp.value = Math.min(
      systemData.combat.hp.value,
      systemData.combat.hp.max
    );
    systemData.combat.mp.value = Math.min(
      systemData.combat.mp.value,
      systemData.combat.mp.max
    );

    // Ensure fate doesn't exceed max
    systemData.fate.value = Math.min(
      systemData.fate.value,
      systemData.fate.max
    );
  }

  /**
   * Prepare derived data for enemy actors.
   * @param {object} systemData
   */
  _prepareEnemyData(systemData) {
    systemData.combat.hp.value = Math.min(
      systemData.combat.hp.value,
      systemData.combat.hp.max
    );
    systemData.combat.mp.value = Math.min(
      systemData.combat.mp.value,
      systemData.combat.mp.max
    );
  }

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

    // Check for critical (6,6) and fumble (1,1)
    const dice = roll.dice[0].results.map((r) => r.result);
    let flavor = `${label} チェック`;
    if (dice[0] === 6 && dice[1] === 6) {
      flavor += " — <strong>クリティカル!</strong>";
    } else if (dice[0] === 1 && dice[1] === 1) {
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
