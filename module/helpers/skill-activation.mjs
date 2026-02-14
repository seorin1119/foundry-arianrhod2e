/**
 * Skill activation helpers for Arianrhod RPG 2E.
 * Handles cost parsing, MP/HP deduction, and chat card creation.
 */

/**
 * Parse a skill cost string into numeric MP and HP values.
 * @param {string} costString - The cost string (e.g. "3", "SL×2", "SLx3")
 * @param {number} skillLevel - The current skill level
 * @returns {{mp: number, hp: number}}
 */
export function parseSkillCost(costString, skillLevel) {
  if (!costString) return { mp: 0, hp: 0 };

  const s = costString.toString().trim();
  if (!s) return { mp: 0, hp: 0 };

  // Check for SL-based cost: "SL×2", "SLx2", "SL*2"
  const slMatch = s.match(/^SL\s*[×x*]\s*(\d+)$/i);
  if (slMatch) {
    return { mp: skillLevel * Number(slMatch[1]), hp: 0 };
  }

  // Pure number
  const num = Number(s);
  if (!Number.isNaN(num)) {
    return { mp: num, hp: 0 };
  }

  // Unrecognized format — treat as zero cost
  return { mp: 0, hp: 0 };
}

/**
 * Activate a skill: deduct cost and post a chat card.
 * @param {Actor} actor - The owning actor
 * @param {Item} item  - The skill item
 * @returns {Promise<boolean>} true if activation succeeded
 */
export async function activateSkill(actor, item) {
  const skillLevel = item.system.level ?? 1;
  const cost = parseSkillCost(item.system.cost, skillLevel);

  // Check MP
  if (cost.mp > 0) {
    const currentMP = actor.system.combat?.mp?.value ?? 0;
    if (currentMP < cost.mp) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.InsufficientMP"));
      return false;
    }
  }

  // Check HP
  if (cost.hp > 0) {
    const currentHP = actor.system.combat?.hp?.value ?? 0;
    if (currentHP < cost.hp) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.InsufficientHP"));
      return false;
    }
  }

  // Deduct resources
  const updates = {};
  if (cost.mp > 0) {
    updates["system.combat.mp.value"] = actor.system.combat.mp.value - cost.mp;
  }
  if (cost.hp > 0) {
    updates["system.combat.hp.value"] = actor.system.combat.hp.value - cost.hp;
  }
  if (Object.keys(updates).length) {
    await actor.update(updates);
  }

  // Build cost display
  const costParts = [];
  if (cost.mp > 0) costParts.push(`MP ${cost.mp}`);
  if (cost.hp > 0) costParts.push(`HP ${cost.hp}`);
  const costDisplay = costParts.length ? costParts.join(" / ") : game.i18n.localize("ARIANRHOD.SkillNoCost");

  // Timing label
  const timingKey = item.system.timing ?? "";
  const timingLabel = timingKey
    ? game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[timingKey] ?? timingKey)
    : "";

  // Build chat HTML
  const content = `
<div class="arianrhod skill-chat-card">
  <h3>\u300A${item.name}\u300B Lv.${skillLevel}</h3>
  <div class="skill-meta">
    <span><strong>${game.i18n.localize("ARIANRHOD.Timing")}:</strong> ${timingLabel}</span>
    <span><strong>${game.i18n.localize("ARIANRHOD.Target")}:</strong> ${item.system.target ?? ""}</span>
    <span><strong>${game.i18n.localize("ARIANRHOD.Range")}:</strong> ${item.system.range ?? ""}</span>
    <span><strong>${game.i18n.localize("ARIANRHOD.Cost")}:</strong> ${costDisplay}</span>
  </div>
  <div class="skill-effect">${item.system.effect ?? ""}</div>
  ${costParts.length ? `<div class="skill-cost-notice">${costParts.map(p => `-${p}`).join(" / ")}</div>` : ""}
</div>`.trim();

  // Post chat message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
  });

  return true;
}
