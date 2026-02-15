/**
 * Structured effect data for priority skills.
 * Maps skill names (Japanese) to their mechanical effects.
 * These are used to auto-apply effects when skills are activated.
 *
 * Effect types:
 *   buff     - Positive stat modifier (ActiveEffect with ADD mode)
 *   debuff   - Negative stat modifier (ActiveEffect with ADD mode, negated value)
 *   heal     - Restore HP or MP
 *   damage   - Direct damage (fixed value)
 *   status   - Apply a status effect
 *   removeStatus - Remove a status effect
 *
 * Duration values:
 *   instant  - No lasting effect (single use / this action only)
 *   round    - Lasts 1 round
 *   3rounds  - Lasts 3 rounds
 *   scene    - Lasts until end of scene
 *   combat   - Lasts until end of combat
 *
 * Stat keys: accuracy, evasion, physDef, magDef, attack, initiative, movement
 */

export const skillEffectsData = {
  // ============================================================
  // Warrior Skills (ウォーリア)
  // ============================================================
  "\u30B9\u30DE\u30C3\u30B7\u30E5": {
    type: "buff", stat: "attack", value: 2, duration: "instant",
    description: "\u30C0\u30E1\u30FC\u30B8+[SL\u00D72]",
  },
  "\u30D1\u30EF\u30FC\u30B9\u30C8\u30E9\u30A4\u30AF": {
    type: "buff", stat: "attack", value: 5, duration: "instant",
    description: "\u30C0\u30E1\u30FC\u30B8+[SL\u00D75]",
  },
  "\u30D0\u30C3\u30B7\u30E5": {
    type: "buff", stat: "accuracy", value: 2, duration: "instant",
    description: "\u547D\u4E2D+[SL\u00D72]\u3001\u8EE2\u5012\u4ED8\u4E0E",
  },
  "\u30AB\u30D0\u30FC\u30EA\u30F3\u30B0": {
    type: "buff", stat: "physDef", value: 0, duration: "instant",
    description: "\u5473\u65B9\u3078\u306E\u30C0\u30E1\u30FC\u30B8\u3092\u80A9\u4EE3\u308F\u308A",
  },
  "\u30D5\u30A9\u30FC\u30C8\u30EC\u30B9": {
    type: "buff", stat: "physDef", value: 5, duration: "round",
    description: "\u7269\u7406\u9632\u5FA1+[SL\u00D75]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },
  "\u30A2\u30FC\u30DE\u30FC\u30D6\u30EC\u30A4\u30AF": {
    type: "debuff", stat: "physDef", value: 5, duration: "round",
    description: "\u5BFE\u8C61\u306E\u7269\u7406\u9632\u5FA1-[SL\u00D75]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },
  "\u30A6\u30A9\u30FC\u30AF\u30E9\u30A4": {
    type: "buff", stat: "attack", value: 3, duration: "round",
    description: "\u7BC4\u56F2\u306E\u5473\u65B9\u306E\u653B\u6483\u529B+[SL\u00D73]",
  },

  // ============================================================
  // Acolyte Skills (アコライト)
  // ============================================================
  "\u30AD\u30E5\u30A2": {
    type: "heal", resource: "hp", value: 10, duration: "instant",
    description: "HP\u56DE\u5FA9 2D+[SL\u00D75]",
  },
  "\u30EA\u30AB\u30D0\u30FC": {
    type: "removeStatus", statusId: "poison", duration: "instant",
    description: "\u30D0\u30C3\u30C9\u30B9\u30C6\u30FC\u30BF\u30B91\u3064\u56DE\u5FA9",
  },
  "\u30D7\u30ED\u30C6\u30AF\u30B7\u30E7\u30F3": {
    type: "buff", stat: "physDef", value: 3, duration: "round",
    description: "\u7269\u7406\u9632\u5FA1+[SL\u00D73]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },
  "\u30D6\u30EC\u30B9": {
    type: "buff", stat: "accuracy", value: 1, duration: "round",
    description: "\u547D\u4E2D+SL\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },
  "\u30C7\u30A3\u30D0\u30A4\u30F3\u30E9\u30A4\u30C8": {
    type: "damage", value: 0, duration: "instant",
    description: "\u5149\u5C5E\u6027\u9B54\u6CD5\u30C0\u30E1\u30FC\u30B8",
  },
  "\u30EA\u30B6\u30EC\u30AF\u30B7\u30E7\u30F3": {
    type: "heal", resource: "hp", value: 0, duration: "instant",
    description: "\u6226\u95D8\u4E0D\u80FD\u56DE\u5FA9",
  },
  "\u30B5\u30F3\u30AF\u30C1\u30E5\u30A2\u30EA": {
    type: "buff", stat: "magDef", value: 5, duration: "round",
    description: "\u9B54\u6CD5\u9632\u5FA1+[SL\u00D75]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },

  // ============================================================
  // Mage Skills (メイジ)
  // ============================================================
  "\u30D5\u30A1\u30A4\u30A2\u30DC\u30EB\u30C8": {
    type: "damage", value: 0, element: "fire", duration: "instant",
    description: "\u706B\u5C5E\u6027\u9B54\u6CD5\u30C0\u30E1\u30FC\u30B8",
  },
  "\u30A2\u30A4\u30B9\u30B8\u30E3\u30D9\u30EA\u30F3": {
    type: "damage", value: 0, element: "water", duration: "instant",
    description: "\u6C34\u5C5E\u6027\u9B54\u6CD5\u30C0\u30E1\u30FC\u30B8",
  },
  "\u30A6\u30A3\u30F3\u30C9\u30AB\u30C3\u30BF\u30FC": {
    type: "damage", value: 0, element: "wind", duration: "instant",
    description: "\u98A8\u5C5E\u6027\u9B54\u6CD5\u30C0\u30E1\u30FC\u30B8",
  },
  "\u30B9\u30C8\u30FC\u30F3\u30D0\u30EC\u30C3\u30C8": {
    type: "damage", value: 0, element: "earth", duration: "instant",
    description: "\u5730\u5C5E\u6027\u9B54\u6CD5\u30C0\u30E1\u30FC\u30B8",
  },
  "\u30A8\u30F3\u30C1\u30E3\u30F3\u30C8\u30A6\u30A7\u30DD\u30F3": {
    type: "buff", stat: "attack", value: 5, duration: "combat",
    description: "\u653B\u6483\u529B+[SL\u00D75]\uFF08\u6226\u95D8\u4E2D\uFF09",
  },
  "\u30DE\u30B8\u30C3\u30AF\u30B7\u30FC\u30EB\u30C9": {
    type: "buff", stat: "magDef", value: 3, duration: "round",
    description: "\u9B54\u6CD5\u9632\u5FA1+[SL\u00D73]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },
  "\u30D8\u30A4\u30B9\u30C8": {
    type: "buff", stat: "initiative", value: 5, duration: "round",
    description: "\u884C\u52D5\u5024+[SL\u00D75]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },
  "\u30B9\u30ED\u30A6": {
    type: "debuff", stat: "initiative", value: 5, duration: "round",
    description: "\u884C\u52D5\u5024-[SL\u00D75]\uFF081\u30E9\u30A6\u30F3\u30C9\uFF09",
  },

  // ============================================================
  // Thief Skills (シーフ)
  // ============================================================
  "\u30B9\u30CA\u30A4\u30D7": {
    type: "buff", stat: "accuracy", value: 2, duration: "instant",
    description: "\u547D\u4E2D+[SL\u00D72]",
  },
  "\u30C8\u30EA\u30C3\u30AF\u30A2\u30BF\u30C3\u30AF": {
    type: "buff", stat: "attack", value: 3, duration: "instant",
    description: "\u30C0\u30E1\u30FC\u30B8+[SL\u00D73]\uFF08\u30D5\u30E9\u30F3\u30AF\u6642\uFF09",
  },
  "\u30A4\u30F4\u30A7\u30A4\u30C9": {
    type: "buff", stat: "evasion", value: 2, duration: "instant",
    description: "\u56DE\u907F+[SL\u00D72]\uFF08\u30EA\u30A2\u30AF\u30B7\u30E7\u30F3\uFF09",
  },
  "\u30CF\u30A4\u30C7\u30A3\u30F3\u30B0": {
    type: "status", statusId: "hidden", duration: "round",
    description: "\u96A0\u5BC6\u72B6\u614B\u306B\u306A\u308B",
  },
  "\u30DD\u30A4\u30BA\u30F3\u30A8\u30C3\u30B8": {
    type: "status", statusId: "poison", statusValue: 1, duration: "instant",
    description: "\u6BD2(1)\u4ED8\u4E0E",
  },
  "\u30B9\u30C6\u30A3\u30FC\u30EB": {
    type: "buff", stat: "accuracy", value: 0, duration: "instant",
    description: "\u30A2\u30A4\u30C6\u30E0\u76D7\u307F",
  },

  // ============================================================
  // Support Class Skills (サポートクラス)
  // ============================================================
  "\u4E71\u308C\u6483\u3061": {
    type: "buff", stat: "attack", value: 0, duration: "instant",
    description: "\u7BC4\u56F2\u653B\u6483\uFF08\u30AC\u30F3\u30B9\u30EA\u30F3\u30AC\u30FC\uFF09",
  },
  "\u5F71\u7E2B\u3044": {
    type: "status", statusId: "slip", duration: "round",
    description: "\u30B9\u30EA\u30C3\u30D7\u4ED8\u4E0E\uFF08\u5FCD\u8005\uFF09",
  },
  "\u30B9\u30C6\u30C3\u30D7": {
    type: "buff", stat: "evasion", value: 3, duration: "round",
    description: "\u56DE\u907F+[SL\u00D73]\uFF08\u30C0\u30F3\u30B5\u30FC\uFF09",
  },
  "\u30A2\u30ED\u30FC\u30EC\u30A4\u30F3": {
    type: "damage", value: 0, duration: "instant",
    description: "\u7BC4\u56F2\u7269\u7406\u30C0\u30E1\u30FC\u30B8\uFF08\u30EC\u30F3\u30B8\u30E3\u30FC\uFF09",
  },
  "\u30C1\u30E3\u30AF\u30E9": {
    type: "heal", resource: "hp", value: 10, duration: "instant",
    description: "HP\u56DE\u5FA9\uFF08\u30E2\u30F3\u30AF\uFF09",
  },
  "\u30D0\u30C8\u30EB\u30BD\u30F3\u30B0": {
    type: "buff", stat: "accuracy", value: 2, duration: "round",
    description: "\u7BC4\u56F2\u5473\u65B9\u306E\u547D\u4E2D+[SL\u00D72]\uFF08\u30D0\u30FC\u30C9\uFF09",
  },
  "\u5C45\u5408\u3044": {
    type: "buff", stat: "attack", value: 10, duration: "instant",
    description: "\u30C0\u30E1\u30FC\u30B8+[SL\u00D710]\uFF08\u30B5\u30E0\u30E9\u30A4\uFF09",
  },
};

/**
 * Get structured effect data for a skill by its Japanese name.
 * @param {string} skillName - The Japanese skill name
 * @returns {object|null} The effect data object, or null if not found
 */
export function getSkillEffectData(skillName) {
  return skillEffectsData[skillName] ?? null;
}

/**
 * Check if a skill name has known structured effect data.
 * @param {string} skillName - The Japanese skill name
 * @returns {boolean}
 */
export function hasSkillEffectData(skillName) {
  return skillName in skillEffectsData;
}
