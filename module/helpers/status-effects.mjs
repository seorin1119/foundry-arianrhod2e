/**
 * Status effect definitions for Arianrhod RPG 2E.
 * Uses Foundry VTT v13 ActiveEffect system with CONFIG.statusEffects format.
 */

/**
 * Get all Arianrhod 2E status effects in CONFIG.statusEffects format.
 * @returns {object[]} Array of status effect definitions
 */
export function getStatusEffects() {
  return [
    {
      id: "poison",
      name: "ARIANRHOD.StatusPoison",
      icon: "icons/svg/poison.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "poison", ongoingDamage: true }
      }
    },
    {
      id: "stun",
      name: "ARIANRHOD.StatusStun",
      icon: "icons/svg/unconscious.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "stun", reactionPenalty: true }
      }
    },
    {
      id: "sleep",
      name: "ARIANRHOD.StatusSleep",
      icon: "icons/svg/sleep.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "sleep", cannotAct: true, removedOnDamage: true }
      }
    },
    {
      id: "paralysis",
      name: "ARIANRHOD.StatusParalysis",
      icon: "icons/svg/paralysis.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "paralysis", cannotMove: true }
      }
    },
    {
      id: "petrification",
      name: "ARIANRHOD.StatusPetrification",
      icon: "icons/svg/stoned.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "petrification", cannotAct: true, cannotMove: true }
      }
    },
    {
      id: "fear",
      name: "ARIANRHOD.StatusFear",
      icon: "icons/svg/terror.svg",
      changes: [
        {
          key: "system.combat.accuracy",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "-2"
        }
      ]
    },
    {
      id: "charm",
      name: "ARIANRHOD.StatusCharm",
      icon: "icons/svg/eye.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "charm", cannotAttackCaster: true }
      }
    },
    {
      id: "frozen",
      name: "ARIANRHOD.StatusFrozen",
      icon: "icons/svg/frozen.svg",
      changes: [
        {
          key: "system.combat.movement",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "-2"
        },
        {
          key: "system.combat.initiative",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "-2"
        }
      ]
    },
    {
      id: "blind",
      name: "ARIANRHOD.StatusBlind",
      icon: "icons/svg/blind.svg",
      changes: [
        {
          key: "system.combat.accuracy",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "-4"
        }
      ]
    },
    {
      id: "prone",
      name: "ARIANRHOD.StatusProne",
      icon: "icons/svg/falling.svg",
      changes: [
        {
          key: "system.combat.evasion",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "-2"
        }
      ]
    },
    {
      id: "flight",
      name: "ARIANRHOD.StatusFlight",
      icon: "icons/svg/wing.svg",
      changes: [
        {
          key: "system.combat.evasion",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "2"
        }
      ],
      flags: {
        arianrhod2e: { statusType: "flight", immuneToProne: true }
      }
    },
    {
      id: "invisible",
      name: "ARIANRHOD.StatusInvisible",
      icon: "icons/svg/invisible.svg",
      changes: [
        {
          key: "system.combat.evasion",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "4"
        }
      ]
    },
    {
      id: "hidden",
      name: "ARIANRHOD.StatusHidden",
      icon: "icons/svg/mystery-man.svg",
      changes: [
        {
          key: "system.combat.evasion",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: "4"
        }
      ],
      flags: {
        arianrhod2e: { statusType: "hidden", breaksOnAction: true }
      }
    },
    {
      id: "darkness",
      name: "ARIANRHOD.StatusDarkness",
      icon: "icons/svg/darkness.svg",
      changes: [],
      flags: {
        arianrhod2e: {
          statusType: "darkness",
          darknessPenalty: true,
          movementLimit: 5,
        }
      }
    },

    // ===== 7대 배드 스테이터스 (Seven Bad Statuses) =====
    // 격노(rage): -2D when attacking non-designated targets
    {
      id: "rage",
      name: "ARIANRHOD.StatusRage",
      icon: "icons/svg/combat.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "rage", nonTargetPenalty: true }
      }
    },
    // 방심(offguard): -1D on major action checks
    {
      id: "offguard",
      name: "ARIANRHOD.StatusOffguard",
      icon: "icons/svg/hazard.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "offguard", majorPenalty: true }
      }
    },
    // 위압(intimidation): Cannot use major actions at all
    {
      id: "intimidation",
      name: "ARIANRHOD.StatusIntimidation",
      icon: "icons/svg/terror.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "intimidation", cannotMajor: true }
      }
    },
    // 넉백(knockback)(n): -5*n to initiative value
    {
      id: "knockback",
      name: "ARIANRHOD.StatusKnockback",
      icon: "icons/svg/thrust.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "knockback", initiativePenalty: true }
      }
    },
    // 슬립(slip): Cannot move
    {
      id: "slip",
      name: "ARIANRHOD.StatusSlip",
      icon: "icons/svg/net.svg",
      changes: [],
      flags: {
        arianrhod2e: { statusType: "slip", cannotMove: true }
      }
    }
  ];
}
