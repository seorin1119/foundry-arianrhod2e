/**
 * Movement System for Arianrhod 2E.
 * Handles combat movement, full movement, and disengagement.
 *
 * Movement types in Arianrhod 2E:
 * - Combat Move (전투이동): Move up to movement value in meters. Can still use minor action.
 * - Full Move (전력이동): Move up to movement x 2 meters. Cannot use minor action this turn.
 * - Disengage (이탈): Move 5m to escape engagement. Cannot use minor action. Requires opposed check.
 */
import { ACTION_TYPES, MOVE_TYPES, getActionState, canPerformAction, consumeAction, setActionState } from "./action-economy.mjs";
import { isEngaged, removeFromEngagement } from "./engagement.mjs";

/**
 * Get available movement options for a combatant.
 * Returns an array of movement choices with availability based on current action state.
 * @param {Combatant} combatant
 * @returns {object[]} Array of {type, label, distance, available, reason}
 */
export function getMovementOptions(combatant) {
  const actor = combatant?.actor;
  if (!actor) return [];

  const movement = actor.system.combat?.movement ?? 0;
  const state = getActionState(combatant);
  const combat = game.combat;
  const engaged = combat ? isEngaged(combat, combatant.id) : false;

  const options = [];

  // Combat Move (전투이동)
  const combatMoveCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
  options.push({
    type: MOVE_TYPES.COMBAT,
    label: game.i18n.localize("ARIANRHOD.MoveCombat"),
    distance: `${movement}m`,
    available: combatMoveCheck.allowed,
    reason: combatMoveCheck.reason,
  });

  // Full Move (전력이동)
  const fullMoveCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
  options.push({
    type: MOVE_TYPES.FULL,
    label: game.i18n.localize("ARIANRHOD.MoveFull"),
    distance: `${movement * 2}m`,
    available: fullMoveCheck.allowed && !state.minor, // Can't full move if already used minor
    reason: state.minor ? "ARIANRHOD.MoveFullBlockedByMinor" : fullMoveCheck.reason,
  });

  // Disengage (이탈) - only shown if currently engaged
  if (engaged) {
    const disengageCheck = canPerformAction(state, ACTION_TYPES.MOVE, actor);
    options.push({
      type: MOVE_TYPES.DISENGAGE,
      label: game.i18n.localize("ARIANRHOD.MoveDisengage"),
      distance: "5m",
      available: disengageCheck.allowed && !state.minor,
      reason: state.minor ? "ARIANRHOD.MoveDisengageBlockedByMinor" : disengageCheck.reason,
    });
  }

  return options;
}

/**
 * Execute a movement for a combatant.
 * Validates the action, consumes it, handles disengage removal, and posts a chat message.
 * @param {Combatant} combatant
 * @param {string} moveType - One of MOVE_TYPES constants
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function executeMovement(combatant, moveType) {
  const actor = combatant?.actor;
  if (!actor) return { success: false, reason: "No actor" };

  // If action economy tracking is disabled, allow freely
  const enabled = game.settings?.get("arianrhod2e", "actionEconomyEnabled") ?? true;
  if (!enabled) return { success: true };

  const state = getActionState(combatant);

  // Validate move action is available
  const check = canPerformAction(state, ACTION_TYPES.MOVE, actor);
  if (!check.allowed) {
    ui.notifications.warn(game.i18n.localize(check.reason));
    return { success: false, reason: check.reason };
  }

  // Additional checks for full move / disengage (cannot be used if minor action already taken)
  if ((moveType === MOVE_TYPES.FULL || moveType === MOVE_TYPES.DISENGAGE) && state.minor) {
    const reason = "ARIANRHOD.MoveFullBlockedByMinor";
    ui.notifications.warn(game.i18n.localize(reason));
    return { success: false, reason };
  }

  // For disengage, remove from engagement
  if (moveType === MOVE_TYPES.DISENGAGE) {
    const combat = game.combat;
    if (combat) {
      await removeFromEngagement(combat, combatant.id);
    }
  }

  // Consume the move action
  const newState = consumeAction(state, ACTION_TYPES.MOVE, moveType);
  await setActionState(combatant, newState);

  // Calculate distance for chat message
  const movement = actor.system.combat?.movement ?? 0;
  const distance = moveType === MOVE_TYPES.FULL ? movement * 2
    : moveType === MOVE_TYPES.DISENGAGE ? 5
    : movement;

  // Resolve the localized move label
  const moveLabel = moveType === MOVE_TYPES.FULL ? game.i18n.localize("ARIANRHOD.MoveFull")
    : moveType === MOVE_TYPES.DISENGAGE ? game.i18n.localize("ARIANRHOD.MoveDisengage")
    : game.i18n.localize("ARIANRHOD.MoveCombat");

  // Post movement notification to chat
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="arianrhod ar-move-msg"><i class="fas fa-person-running"></i> ${actor.name}: ${moveLabel} (${distance}m)</div>`,
  });

  return { success: true };
}
