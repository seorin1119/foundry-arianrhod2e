/**
 * Arianrhod RPG 2E Dice Rolling System
 *
 * Core mechanic: 2d6 + modifier vs target number
 * Critical: double 6 (6,6)
 * Fumble: double 1 (1,1)
 * Fate: spend fate points to add +1d6 each
 */

/**
 * Perform a standard 2d6 check with optional modifiers and fate dice.
 * @param {object} options
 * @param {number} options.modifier - Flat modifier to add
 * @param {number} options.fateDice - Number of fate dice to add (1d6 each)
 * @param {string} options.label - Descriptive label for the roll
 * @param {Actor} options.actor - The actor making the roll
 * @returns {Promise<Roll>}
 */
export async function rollCheck({
  modifier = 0,
  fateDice = 0,
  label = "",
  actor = null,
} = {}) {
  let formula = "2d6";
  if (modifier !== 0) {
    formula += ` + ${modifier}`;
  }
  if (fateDice > 0) {
    formula += ` + ${fateDice}d6`;
  }

  const roll = new Roll(formula);
  await roll.evaluate();

  // Check for critical and fumble on the initial 2d6
  const baseDice = roll.dice[0].results.map((r) => r.result);
  let flavor = label || game.i18n.localize("ARIANRHOD.Check");

  if (baseDice[0] === 6 && baseDice[1] === 6) {
    flavor += " — <strong>クリティカル!</strong>";
  } else if (baseDice[0] === 1 && baseDice[1] === 1) {
    flavor += " — <strong>ファンブル!</strong>";
  }

  if (fateDice > 0) {
    flavor += ` (フェイト ${fateDice}個使用)`;
  }

  const speaker = actor
    ? ChatMessage.getSpeaker({ actor })
    : ChatMessage.getSpeaker();

  await roll.toMessage({
    speaker: speaker,
    flavor: flavor,
  });

  return roll;
}

/**
 * Prompt a dialog for a roll with optional fate dice.
 * @param {object} options
 * @param {string} options.title - Dialog title
 * @param {number} options.modifier - Default modifier
 * @param {number} options.maxFate - Maximum fate dice available
 * @param {string} options.label - Roll label
 * @param {Actor} options.actor - The actor making the roll
 * @returns {Promise<Roll|null>}
 */
export async function rollCheckDialog({
  title = "",
  modifier = 0,
  maxFate = 0,
  label = "",
  actor = null,
} = {}) {
  const dialogTitle = title || game.i18n.localize("ARIANRHOD.RollCheck");

  const content = `
    <form>
      <div class="form-group">
        <label>${game.i18n.localize("ARIANRHOD.Modifier")}</label>
        <input type="number" name="modifier" value="${modifier}" />
      </div>
      ${
        maxFate > 0
          ? `
      <div class="form-group">
        <label>${game.i18n.localize("ARIANRHOD.FateDice")} (最大: ${maxFate})</label>
        <input type="number" name="fateDice" value="0" min="0" max="${maxFate}" />
      </div>
      `
          : ""
      }
    </form>
  `;

  return new Promise((resolve) => {
    new Dialog({
      title: dialogTitle,
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice"></i>',
          label: game.i18n.localize("ARIANRHOD.Roll"),
          callback: async (html) => {
            const mod = parseInt(html.find('[name="modifier"]').val()) || 0;
            const fate =
              parseInt(html.find('[name="fateDice"]').val()) || 0;
            const result = await rollCheck({
              modifier: mod,
              fateDice: Math.min(fate, maxFate),
              label: label,
              actor: actor,
            });
            resolve(result);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ARIANRHOD.Cancel"),
          callback: () => resolve(null),
        },
      },
      default: "roll",
    }).render(true);
  });
}
