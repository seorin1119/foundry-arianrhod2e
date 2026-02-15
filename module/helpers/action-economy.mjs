/**
 * Action Economy for Arianrhod 2E combat.
 * Tracks major/minor/move/free/reaction actions per combatant per turn.
 * State stored in combatant flags: flags.arianrhod2e.actionState
 */

// Action types
export const ACTION_TYPES = {
  MAJOR: "major",
  MINOR: "minor",
  MOVE: "move",
  FREE: "free",
  REACTION: "reaction",
};

// Move subtypes
export const MOVE_TYPES = {
  COMBAT: "combat",       // 전투이동: movement meters
  FULL: "full",           // 전력이동: movement×2, blocks minor
  DISENGAGE: "disengage", // 이탈: 5m, blocks minor, requires contest
};

/**
 * Create a fresh action state for a new turn.
 * @returns {object} A blank action state
 */
export function createActionState() {
  return {
    major: false,
    minor: false,
    move: false,
    moveType: null,   // null | "combat" | "full" | "disengage"
    freeCount: 0,     // number of free actions used this turn
    reaction: false,
  };
}

/**
 * Map skill timing to action type.
 * @param {string} timing - Skill timing key (from config.skillTimings)
 * @returns {string|null} Action type or null for non-action timings
 */
export function getTimingAction(timing) {
  switch (timing) {
    case "action": return ACTION_TYPES.MAJOR;
    case "minor": return ACTION_TYPES.MINOR;
    case "move": return ACTION_TYPES.MOVE;
    case "free": return ACTION_TYPES.FREE;
    case "reaction": return ACTION_TYPES.REACTION;
    default: return null; // passive, setup, initiative, judge, damage, afterDamage, cleanup, item, always, other
  }
}

/**
 * Check if an action can be performed given current state and actor conditions.
 * Returns { allowed: true } or { allowed: false, reason: "i18n.key" }
 * @param {object} state - Current action state
 * @param {string} actionType - One of ACTION_TYPES values
 * @param {Actor|null} actor - The actor performing the action (optional)
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canPerformAction(state, actionType, actor = null) {
  // Check incapacitation (HP=0)
  if (actor) {
    const hp = actor.system?.combat?.hp;
    if (hp && hp.value <= 0) {
      return { allowed: false, reason: "ARIANRHOD.ActionBlockedIncapacitated" };
    }
    // 위압 (intimidation): cannot use major actions
    if (actionType === ACTION_TYPES.MAJOR && actor.hasStatusEffect?.("intimidation")) {
      return { allowed: false, reason: "ARIANRHOD.ActionBlockedIntimidation" };
    }
    // 석화/수면/기절 check (cannotAct flags) - block major and minor
    if ((actionType === ACTION_TYPES.MAJOR || actionType === ACTION_TYPES.MINOR) && _hasCannotActStatus(actor)) {
      return { allowed: false, reason: "ARIANRHOD.ActionBlockedStatus" };
    }
    // 마비/슬립: cannot move
    if (actionType === ACTION_TYPES.MOVE && _hasCannotMoveStatus(actor)) {
      return { allowed: false, reason: "ARIANRHOD.ActionBlockedCannotMove" };
    }
  }

  switch (actionType) {
    case ACTION_TYPES.MAJOR:
      if (state.major) return { allowed: false, reason: "ARIANRHOD.ActionMajorUsed" };
      break;
    case ACTION_TYPES.MINOR:
      if (state.minor) return { allowed: false, reason: "ARIANRHOD.ActionMinorUsed" };
      // Full move or disengage blocks minor
      if (state.moveType === MOVE_TYPES.FULL || state.moveType === MOVE_TYPES.DISENGAGE) {
        return { allowed: false, reason: "ARIANRHOD.ActionMinorBlockedByMove" };
      }
      break;
    case ACTION_TYPES.MOVE:
      if (state.move) return { allowed: false, reason: "ARIANRHOD.ActionMoveUsed" };
      break;
    case ACTION_TYPES.FREE:
      // Free actions are limited but GM discretion - allow up to 3
      if (state.freeCount >= 3) return { allowed: false, reason: "ARIANRHOD.ActionFreeLimit" };
      break;
    case ACTION_TYPES.REACTION:
      if (state.reaction) return { allowed: false, reason: "ARIANRHOD.ActionReactionUsed" };
      break;
  }
  return { allowed: true };
}

/**
 * Consume an action and return the updated state.
 * @param {object} state - Current action state
 * @param {string} actionType - One of ACTION_TYPES values
 * @param {string|null} moveType - For move actions, one of MOVE_TYPES values
 * @returns {object} New action state with the action consumed
 */
export function consumeAction(state, actionType, moveType = null) {
  const newState = { ...state };
  switch (actionType) {
    case ACTION_TYPES.MAJOR:
      newState.major = true;
      break;
    case ACTION_TYPES.MINOR:
      newState.minor = true;
      break;
    case ACTION_TYPES.MOVE:
      newState.move = true;
      newState.moveType = moveType;
      break;
    case ACTION_TYPES.FREE:
      newState.freeCount = (newState.freeCount || 0) + 1;
      break;
    case ACTION_TYPES.REACTION:
      newState.reaction = true;
      break;
  }
  return newState;
}

/**
 * Get action state from a combatant.
 * @param {Combatant} combatant - The combatant to read state from
 * @returns {object} The current action state
 */
export function getActionState(combatant) {
  return combatant?.getFlag("arianrhod2e", "actionState") ?? createActionState();
}

/**
 * Save action state to a combatant.
 * @param {Combatant} combatant - The combatant to save state to
 * @param {object} state - The action state to save
 */
export async function setActionState(combatant, state) {
  await combatant.setFlag("arianrhod2e", "actionState", state);
}

/**
 * Get a summary of remaining actions for display.
 * @param {object} state - Current action state
 * @returns {object} Summary of available actions
 */
export function getActionSummary(state) {
  return {
    majorAvailable: !state.major,
    minorAvailable: !state.minor && state.moveType !== MOVE_TYPES.FULL && state.moveType !== MOVE_TYPES.DISENGAGE,
    moveAvailable: !state.move,
    moveType: state.moveType,
    freeCount: state.freeCount || 0,
    reactionAvailable: !state.reaction,
  };
}

// ---- Internal helpers ----

/**
 * Check if actor has a status that prevents acting (sleep, petrification).
 * Note: stun only applies -1D to reaction checks, it does NOT prevent acting.
 * @param {Actor} actor
 * @returns {boolean}
 */
function _hasCannotActStatus(actor) {
  const cannotActStatuses = ["sleep", "petrification"];
  return cannotActStatuses.some(s => actor.hasStatusEffect?.(s));
}

/**
 * Check if actor has a status that prevents movement (paralysis, petrification, slip).
 * @param {Actor} actor
 * @returns {boolean}
 */
function _hasCannotMoveStatus(actor) {
  const cannotMoveStatuses = ["paralysis", "petrification", "slip"];
  return cannotMoveStatuses.some(s => actor.hasStatusEffect?.(s));
}
