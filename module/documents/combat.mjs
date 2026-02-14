/**
 * Arianrhod 2E Combat
 * Handles static initiative ordering (no dice roll).
 * 行動値 = AGI bonus + SEN bonus + equipment initiative mods
 */
export class ArianrhodCombat extends Combat {
  /** @override */
  _sortCombatants(a, b) {
    // Higher initiative goes first
    const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
    if (ia !== ib) return ib - ia;
    // On tie: PCs before NPCs
    const aIsPC = a.actor?.type === "character" ? 1 : 0;
    const bIsPC = b.actor?.type === "character" ? 1 : 0;
    if (aIsPC !== bIsPC) return bIsPC - aIsPC;
    // Final tie: alphabetical
    return (a.name || "").localeCompare(b.name || "");
  }

  /** @override */
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant);
    const actor = combatant.actor;
    if (!actor) return;

    // Process poison damage
    if (actor.hasStatusEffect?.("poison")) {
      const currentHP = actor.system.combat.hp.value;
      const poisonDmg = 2;
      await actor.update({"system.combat.hp.value": Math.max(0, currentHP - poisonDmg)});
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({actor}),
        content: `<div class="arianrhod status-msg"><img src="icons/svg/poison.svg" width="16" height="16"/> ${actor.name}: ${game.i18n.localize("ARIANRHOD.PoisonDamage")} (-${poisonDmg} HP)</div>`
      });
    }
  }
}
