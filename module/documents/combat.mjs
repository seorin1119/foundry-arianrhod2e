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
  processInitiativePhase,
  processSetupPhase,
  processCombatEnd,
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
    // Initialize state before starting so _onStartTurn has clean state
    await initializeCombat(this);
    await super.startCombat();
    // Process setup phase for round 1
    await processSetupPhase(this, 1);
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
    // Process cleanup phase (poison damage, auto-recover statuses)
    await processCleanup(this);
    // Process initiative phase (stun recovery at new round start)
    await processInitiativePhase(this);
    // Advance round
    const result = await super.nextRound();
    // Process setup phase for the new round (notify setup-timing skills)
    await processSetupPhase(this, this.round);
    return result;
  }

  /**
   * Process combat end: recover incapacitated characters before deletion.
   * Per rulebook p.227: HP=0 → HP=1 only when combat ends.
   * @override
   */
  async _preDelete(options, user) {
    await super._preDelete(options, user);
    if (this.started) {
      await processCombatEnd(this);
    }
  }

  /**
   * Get current combat phase.
   * @type {string}
   */
  get phase() {
    return this.getFlag("arianrhod2e", "phase") ?? PHASES.MAIN;
  }
}
