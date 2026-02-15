/**
 * Arianrhod RPG 2E Dice Rolling System
 *
 * Core mechanic: 2d6 + modifier vs target number
 * Critical: 2 or more dice showing 6
 * Fumble: 2 or more dice showing 1 (on base 2d6 only)
 * Fate: spend fate points to add +1d6 each
 */

/**
 * Analyze a roll for critical/fumble status.
 * @param {Roll} roll - Evaluated Roll object
 * @param {number} fateDice - Number of fate dice used
 * @returns {{allDice: number[], sixCount: number, oneCount: number, isCritical: boolean, isFumble: boolean}}
 */
export function analyzeRoll(roll, fateDice = 0) {
  const allDice = roll.dice.flatMap(d => d.results.map(r => r.result));
  const sixCount = allDice.filter(d => d === 6).length;
  const oneCount = allDice.filter(d => d === 1).length;
  const criticalRange = game.settings?.get("arianrhod2e", "criticalRange") ?? 2;
  return {
    allDice,
    sixCount,
    oneCount,
    isCritical: sixCount >= criticalRange,
    isFumble: oneCount >= 2 && fateDice === 0,
  };
}

/**
 * Build a roll formula string.
 */
function buildFormula(baseDice, modifier, fateDice) {
  let formula = baseDice;
  if (modifier > 0) formula += ` + ${modifier}`;
  else if (modifier < 0) formula += ` - ${Math.abs(modifier)}`;
  if (fateDice > 0) formula += ` + ${fateDice}d6`;
  return formula;
}

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
  const formula = buildFormula("2d6", modifier, fateDice);
  const roll = new Roll(formula);
  await roll.evaluate();

  const { isCritical, isFumble, sixCount } = analyzeRoll(roll, fateDice);

  let flavor = label || game.i18n.localize("ARIANRHOD.Check");
  if (isCritical) {
    flavor += ` — <strong>${game.i18n.localize("ARIANRHOD.Critical")}! (6×${sixCount})</strong>`;
  } else if (isFumble) {
    flavor += ` — <strong>${game.i18n.localize("ARIANRHOD.Fumble")}!</strong>`;
  }
  if (fateDice > 0) {
    flavor += ` (${game.i18n.format("ARIANRHOD.FateUsed", { count: fateDice })})`;
  }

  const speaker = actor
    ? ChatMessage.getSpeaker({ actor })
    : ChatMessage.getSpeaker();

  await roll.toMessage({ speaker, flavor });
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
  const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
  if (!fateEnabled) maxFate = 0;

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
        <label>${game.i18n.localize("ARIANRHOD.FateDice")} (${game.i18n.localize("ARIANRHOD.Max")}: ${maxFate})</label>
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
 * Roll D66 for life path table and return the table key.
 * D66: two dice read as tens/ones digits (11~66, 36 results).
 * Table entries cover pairs: 11~12, 13~14, 15~16, 21~22, etc.
 * @param {string} category - "origin", "circumstance", or "objective"
 * @param {Actor} actor - The actor rolling
 * @returns {Promise<{roll: Roll, tableKey: string, label: string}>}
 */
export async function rollLifePath(category, actor) {
  const roll = new Roll("2d6");
  await roll.evaluate();

  // D66: first die = tens digit, second die = ones digit (order matters!)
  const die1 = roll.dice[0].results[0].result;
  const die2 = roll.dice[0].results[1].result;
  const d66Value = `${die1}${die2}`;

  // Map ones digit to table key: 1,2→1; 3,4→3; 5,6→5
  const mappedDie2 = die2 % 2 === 0 ? die2 - 1 : die2;
  const tableKey = `${die1}${mappedDie2}`;

  const categoryLabel = game.i18n.localize(`ARIANRHOD.${category.charAt(0).toUpperCase() + category.slice(1)}`);
  const entryLabel = game.i18n.localize(CONFIG.ARIANRHOD.lifePath[category]?.[tableKey] || "");

  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  await ChatMessage.create({
    speaker: speaker,
    flavor: `${categoryLabel} (D66: ${d66Value}) — <strong>${entryLabel}</strong>`,
    content: `<div class="dice-roll">
      <div class="dice-result">
        <div class="dice-formula">${roll.formula} (D66)</div>
        <div class="dice-tooltip" style="display: none;">
          <div class="dice-rolls">
            <ol class="dice-rolls">
              <li class="roll die d6">${die1}</li>
              <li class="roll die d6">${die2}</li>
            </ol>
          </div>
        </div>
        <h4 class="dice-total">${d66Value}</h4>
      </div>
    </div>`,
    rolls: [roll],
  });

  return { roll, tableKey, label: entryLabel };
}

/* -------------------------------------------- */
/*  FS Judgment (Favorable Situation)           */
/* -------------------------------------------- */

/**
 * FS Progress Check result table.
 * Maps (achievement - difficulty) to progress points.
 * Critical is handled separately.
 */
const FS_PROGRESS_TABLE = [
  { min: 6, label: "ARIANRHOD.FSFantastic", progress: 4 },
  { min: 5, label: "ARIANRHOD.FSGreat", progress: 3 },
  { min: 4, label: "ARIANRHOD.FSBrilliant", progress: 2 },
  { min: 3, label: "ARIANRHOD.FSEasy", progress: 2 },
  { min: 2, label: "ARIANRHOD.FSComfortable", progress: 1 },
  { min: 1, label: "ARIANRHOD.FSBarely", progress: 1 },
  { min: 0, label: "ARIANRHOD.FSNarrow", progress: 1 },
  { min: -1, label: "ARIANRHOD.FSCloseFailure", progress: 0 },
  { min: -2, label: "ARIANRHOD.FSSlightlyShort", progress: 0 },
  { min: -3, label: "ARIANRHOD.FSClearFailure", progress: -1 },
  { min: -4, label: "ARIANRHOD.FSMajorFailure", progress: -1 },
];
const FS_CATASTROPHIC = { label: "ARIANRHOD.FSCatastrophic", progress: -2 };

/**
 * Calculate FS progress points from achievement vs difficulty.
 * @param {number} achievement - Roll total
 * @param {number} difficulty - Target DC
 * @param {boolean} isCritical - Whether the roll was a critical
 * @param {boolean} isFumble - Whether the roll was a fumble
 * @param {number} sixCount - Number of 6s rolled (for critical bonus)
 * @returns {{progress: number, label: string, resultLabel: string}}
 */
export function calculateFSProgress(achievement, difficulty, isCritical, isFumble, sixCount = 0) {
  if (isCritical) {
    return {
      progress: null, // Needs extra 1D roll + sixCount
      label: "ARIANRHOD.FSUltimate",
      resultLabel: game.i18n.localize("ARIANRHOD.FSUltimate"),
      needsCriticalRoll: true,
      sixCount,
    };
  }
  if (isFumble) {
    return {
      progress: FS_CATASTROPHIC.progress,
      label: FS_CATASTROPHIC.label,
      resultLabel: game.i18n.localize(FS_CATASTROPHIC.label),
      needsCriticalRoll: false,
      sixCount: 0,
    };
  }

  const diff = achievement - difficulty;
  if (diff <= -5) {
    return {
      progress: FS_CATASTROPHIC.progress,
      label: FS_CATASTROPHIC.label,
      resultLabel: game.i18n.localize(FS_CATASTROPHIC.label),
      needsCriticalRoll: false,
      sixCount: 0,
    };
  }

  for (const entry of FS_PROGRESS_TABLE) {
    if (diff >= entry.min) {
      return {
        progress: entry.progress,
        label: entry.label,
        resultLabel: game.i18n.localize(entry.label),
        needsCriticalRoll: false,
        sixCount: 0,
      };
    }
  }

  return {
    progress: FS_CATASTROPHIC.progress,
    label: FS_CATASTROPHIC.label,
    resultLabel: game.i18n.localize(FS_CATASTROPHIC.label),
    needsCriticalRoll: false,
    sixCount: 0,
  };
}

/**
 * Roll an FS Progress Check and post results to chat.
 * @param {object} options
 * @param {number} options.modifier - Ability modifier
 * @param {number} options.difficulty - DC for the check
 * @param {number} options.fateDice - Fate dice used
 * @param {string} options.label - Check label
 * @param {number} options.currentProgress - Current progress points
 * @param {number} options.completionTarget - Target to complete
 * @param {Actor} options.actor - The actor making the roll
 * @returns {Promise<{roll: Roll, progress: number, total: number}>}
 */
export async function rollFSCheck({
  modifier = 0,
  difficulty = 11,
  fateDice = 0,
  label = "",
  currentProgress = 0,
  completionTarget = 10,
  actor = null,
} = {}) {
  const formula = buildFormula("2d6", modifier, fateDice);
  const roll = new Roll(formula);
  await roll.evaluate();

  const { isCritical, isFumble, sixCount } = analyzeRoll(roll, fateDice);
  const achievement = roll.total;

  let fsResult = calculateFSProgress(achievement, difficulty, isCritical, isFumble, sixCount);
  let progress = fsResult.progress;
  let criticalExtra = "";

  // Handle critical: roll 1D + sixCount
  if (fsResult.needsCriticalRoll) {
    const critRoll = new Roll("1d6");
    await critRoll.evaluate();
    progress = critRoll.total + sixCount;
    criticalExtra = ` (1D=${critRoll.total} + 6×${sixCount} = +${progress})`;
  }

  const newTotal = Math.max(0, currentProgress + progress);

  const checkLabel = label || game.i18n.localize("ARIANRHOD.FSProgressCheck");
  const speaker = actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker();

  // Build chat card
  const progressClass = progress > 0 ? "ar-fs-positive" : (progress < 0 ? "ar-fs-negative" : "ar-fs-zero");
  const progressSign = progress > 0 ? `+${progress}` : `${progress}`;

  let content = `<div class="ar-combat-card ar-fs-card">`;
  content += `<div class="ar-card-row"><span class="ar-card-label">${checkLabel}</span></div>`;
  content += `<div class="ar-card-row">`;
  content += `<span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Achievement")}</span>`;
  content += `<span class="ar-card-value">${achievement}</span>`;
  content += `</div>`;
  content += `<div class="ar-card-row ar-card-defense">`;
  content += `<span class="ar-card-label">vs DC ${difficulty}</span>`;
  content += `<span class="ar-card-value">${achievement - difficulty >= 0 ? "+" : ""}${achievement - difficulty}</span>`;
  content += `</div>`;

  // Result line
  if (isCritical) {
    content += `<div class="ar-card-row"><span class="ar-critical">${fsResult.resultLabel}${criticalExtra}</span></div>`;
  } else if (isFumble) {
    content += `<div class="ar-card-row"><span class="ar-fumble">${fsResult.resultLabel}</span></div>`;
  } else {
    content += `<div class="ar-card-row"><span>${fsResult.resultLabel}</span></div>`;
  }

  // Progress line
  content += `<div class="ar-card-row ar-card-final">`;
  content += `<span class="ar-card-label">${game.i18n.localize("ARIANRHOD.FSProgress")}</span>`;
  content += `<span class="ar-card-value ${progressClass}">${progressSign}</span>`;
  content += `</div>`;

  // Total progress bar
  const pct = Math.min(100, Math.round((newTotal / completionTarget) * 100));
  content += `<div class="ar-fs-progress-bar">`;
  content += `<div class="ar-fs-progress-fill" style="width: ${pct}%"></div>`;
  content += `<span class="ar-fs-progress-text">${newTotal} / ${completionTarget}</span>`;
  content += `</div>`;

  if (newTotal >= completionTarget) {
    content += `<div class="ar-card-row"><span class="ar-critical">${game.i18n.localize("ARIANRHOD.FSComplete")}</span></div>`;
  }

  if (fateDice > 0) {
    content += `<div class="ar-fate-used">${game.i18n.format("ARIANRHOD.FateUsed", { count: fateDice })}</div>`;
  }
  content += `</div>`;

  await ChatMessage.create({
    speaker,
    content,
    rolls: [roll],
    flavor: `<i class="fas fa-star"></i> ${game.i18n.localize("ARIANRHOD.FSJudgment")}`,
  });

  return { roll, progress, total: newTotal };
}
