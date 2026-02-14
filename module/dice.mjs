/**
 * Arianrhod RPG 2E Dice Rolling System
 *
 * Core mechanic: 2d6 + modifier vs target number
 * Critical: 2 or more dice showing 6
 * Fumble: 2 or more dice showing 1 (on base 2d6 only)
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

  // Collect all dice results from all dice pools
  const allDice = [];
  for (const dicePool of roll.dice) {
    allDice.push(...dicePool.results.map((r) => r.result));
  }

  // Count 6s and 1s across all dice
  const sixCount = allDice.filter((d) => d === 6).length;
  const oneCount = allDice.filter((d) => d === 1).length;

  let flavor = label || game.i18n.localize("ARIANRHOD.Check");

  // Critical: 2 or more 6s
  if (sixCount >= 2) {
    flavor += ` — <strong>クリティカル! (6×${sixCount})</strong>`;
  }
  // Fumble: 2 or more 1s (only check base 2d6)
  else if (oneCount >= 2 && fateDice === 0) {
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

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: dialogTitle },
    content: content,
    ok: {
      icon: "fas fa-dice",
      label: game.i18n.localize("ARIANRHOD.Roll"),
      callback: (event, button, dialog) => {
        const form = button.form;
        const mod = parseInt(form.querySelector('[name="modifier"]').value) || 0;
        const fate = parseInt(form.querySelector('[name="fateDice"]')?.value) || 0;
        return { modifier: mod, fateDice: Math.min(fate, maxFate) };
      },
    },
    rejectClose: false,
  });

  if (!result) return null;

  return rollCheck({
    modifier: result.modifier,
    fateDice: result.fateDice,
    label: label,
    actor: actor,
  });
}

/**
 * Roll 2d6 for life path table and return the table key.
 * Life path tables use concatenated dice notation (11 = 1+1, 13 = 1+3, 65 = 6+5, etc.)
 * @param {string} category - "origin", "circumstance", or "objective"
 * @param {Actor} actor - The actor rolling
 * @returns {Promise<{roll: Roll, tableKey: string, label: string}>}
 */
export async function rollLifePath(category, actor) {
  const roll = new Roll("2d6");
  await roll.evaluate();

  // Get individual die results (sorted numerically for table lookup)
  const dice = roll.dice[0].results.map(r => r.result).sort((a, b) => a - b);
  const die1 = dice[0];
  const die2 = dice[1];

  // Table key is concatenation of sorted dice (e.g., 1+3 = "13", 5+6 = "56")
  const tableKey = `${die1}${die2}`;

  const categoryLabel = game.i18n.localize(`ARIANRHOD.${category.charAt(0).toUpperCase() + category.slice(1)}`);
  const entryLabel = game.i18n.localize(CONFIG.ARIANRHOD.lifePath[category]?.[tableKey] || "");

  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  // Create custom chat message to show concatenated notation instead of sum
  await ChatMessage.create({
    speaker: speaker,
    flavor: `${categoryLabel} (${tableKey}) — <strong>${entryLabel}</strong>`,
    content: `<div class="dice-roll">
      <div class="dice-result">
        <div class="dice-formula">${roll.formula}</div>
        <div class="dice-tooltip" style="display: none;">
          <div class="dice-rolls">
            <ol class="dice-rolls">
              <li class="roll die d6">${die1}</li>
              <li class="roll die d6">${die2}</li>
            </ol>
          </div>
        </div>
        <h4 class="dice-total">${tableKey}</h4>
      </div>
    </div>`,
    roll: roll,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
  });

  return { roll, tableKey, label: entryLabel };
}
