/**
 * Arianrhod 2E Combat
 * Handles static initiative ordering, phase management, and cleanup.
 *
 * Initiative: 行動値 = AGI bonus + SEN bonus + equipment initiative mods
 * Ordering: Higher initiative first, PCs before NPCs on tie, then alphabetical.
 *
 * Integrates with combat-manager.mjs for:
 *   - Phase tracking (setup → initiative → main → cleanup)
 *   - Action economy per turn
 *   - Cleanup phase processing (poison damage, bad status removal, HP recovery)
 */
import {
  initializeCombat,
  onTurnStart,
  onTurnEnd,
  processCleanup,
  PHASES,
} from "../helpers/combat-manager.mjs";

export class ArianrhodCombat extends Combat {

  /**
   * Sort combatants by initiative descending, PCs before NPCs on tie, then alphabetical.
   * @override
   */
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

  /**
   * Called when combat starts. Initializes combat state, action economies, and phase.
   * @override
   */
  async startCombat() {
    await super.startCombat();
    await initializeCombat(this);
    return this;
  }

  /**
   * Process the start of a combatant's turn.
   * Resets action state and transitions to main phase.
   * @override
   */
  async _onStartTurn(combatant) {
    await super._onStartTurn(combatant);
    await onTurnStart(this, combatant);
  }

  /**
   * Process the end of a combatant's turn.
   * @override
   */
  async _onEndTurn(combatant) {
    await super._onEndTurn(combatant);
    await onTurnEnd(this, combatant);
  }

  /**
   * Advance to the next round.
   * Processes cleanup phase (poison damage, bad status removal, HP recovery)
   * before advancing.
   * @override
   */
  async nextRound() {
    // Process cleanup before advancing to next round
    await processCleanup(this);
    return super.nextRound();
  }

  /**
   * Get current combat phase.
   * @type {string}
   */
  get phase() {
    return this.getFlag("arianrhod2e", "phase") ?? PHASES.MAIN;
  }
}
