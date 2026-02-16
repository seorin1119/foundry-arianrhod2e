/**
 * Rest and Recovery for Arianrhod 2E
 * Per rulebook p.173-174
 */

/**
 * Perform a short rest for an actor.
 * Recovers HP/MP to max and removes bad status effects.
 * @param {Actor} actor - The actor to rest
 * @returns {Promise<object>} Rest results
 */
export async function performRest(actor) {
  const hp = actor.system.combat?.hp;
  const mp = actor.system.combat?.mp;

  const hpRecovered = (hp?.max ?? 0) - (hp?.value ?? 0);
  const mpRecovered = (mp?.max ?? 0) - (mp?.value ?? 0);

  // Recover HP and MP to max
  const updates = {};
  if (hp && hp.value < hp.max) {
    updates["system.combat.hp.value"] = hp.max;
  }
  if (mp && mp.value < mp.max) {
    updates["system.combat.mp.value"] = mp.max;
  }

  if (Object.keys(updates).length > 0) {
    // Use incapacitationRecovery flag to bypass the HP=0 block
    await actor.update(updates, { arianrhod2e: { incapacitationRecovery: true } });
  }

  // Remove bad status effects
  const badStatuses = [
    "poison", "stun", "sleep", "paralysis", "petrification",
    "fear", "charm", "frozen", "blind", "prone", "darkness",
    "rage", "offguard", "intimidation", "knockback", "slip"
  ];

  const removedStatuses = [];
  for (const statusId of badStatuses) {
    if (actor.hasStatusEffect?.(statusId)) {
      await actor.toggleStatusEffect(statusId);
      removedStatuses.push(statusId);
    }
  }

  // Also clear dead flag if applicable
  if (actor.system.dead) {
    await actor.update({ "system.dead": false });
  }

  // Post chat message
  const restCardContent = buildRestChatCard(actor, hpRecovered, mpRecovered, removedStatuses);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: restCardContent,
  });

  return { hpRecovered, mpRecovered, removedStatuses };
}

function buildRestChatCard(actor, hpRecovered, mpRecovered, removedStatuses) {
  let content = `<div class="ar-combat-card ar-rest-card">`;
  content += `<header class="ar-card-header">`;
  content += `<img class="ar-card-icon" src="${actor.img || 'icons/svg/mystery-man.svg'}" width="32" height="32" />`;
  content += `<div class="ar-card-title">`;
  content += `<h3><i class="fas fa-bed"></i> ${game.i18n.localize("ARIANRHOD.Rest")}</h3>`;
  content += `<span class="ar-card-subtitle">${actor.name}</span>`;
  content += `</div></header>`;

  if (hpRecovered > 0) {
    content += `<div class="ar-card-row"><span class="ar-card-label">HP</span><span class="ar-card-value ar-hp-recover">+${hpRecovered}</span></div>`;
  }
  if (mpRecovered > 0) {
    content += `<div class="ar-card-row"><span class="ar-card-label">MP</span><span class="ar-card-value ar-mp-recover">+${mpRecovered}</span></div>`;
  }
  if (removedStatuses.length > 0) {
    const statusLabels = removedStatuses.map(s => {
      const statusDef = CONFIG.statusEffects?.find(se => se.id === s);
      return statusDef ? game.i18n.localize(statusDef.name) : s;
    }).join(", ");
    content += `<div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.StatusRecovered")}</span><span class="ar-card-value">${statusLabels}</span></div>`;
  }

  if (hpRecovered === 0 && mpRecovered === 0 && removedStatuses.length === 0) {
    content += `<div class="ar-card-row"><span class="ar-card-label">${game.i18n.localize("ARIANRHOD.RestFullHealth")}</span></div>`;
  }

  content += `</div>`;
  return content;
}
