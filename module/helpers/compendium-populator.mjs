/**
 * Compendium Populator for Arianrhod 2E
 * Populates compendium packs from library data (skills, equipment, enemy skills).
 */

import { skillLibrary } from './skill-library.mjs';
import { equipmentLibrary } from './equipment-library.mjs';
import { enemySkillLibrary } from './enemy-skill-library.mjs';

/**
 * Resolve a localized name based on the current game language.
 * @param {object} entry - Library entry with name/nameEn/nameKo fields
 * @returns {string}
 */
function resolveName(entry) {
  const lang = game.i18n.lang;
  if (lang === 'ko') return entry.nameKo || entry.nameEn || entry.name;
  if (lang === 'en') return entry.nameEn || entry.name;
  return entry.name;
}

/**
 * Resolve a localized description/effect field.
 * @param {object} entry - Library entry
 * @param {string} jaField - Japanese field name (e.g. 'description', 'effect')
 * @param {string} [koField] - Korean field name (e.g. 'descriptionKo', 'effectKo')
 * @param {string} [enField] - English field name (e.g. 'effectEn')
 * @returns {string}
 */
function resolveText(entry, jaField, koField, enField) {
  const lang = game.i18n.lang;
  if (lang === 'ko') return (koField && entry[koField]) || (enField && entry[enField]) || entry[jaField] || '';
  if (lang === 'en') return (enField && entry[enField]) || entry[jaField] || '';
  return entry[jaField] || '';
}

/* ---------------------------------------- */
/*  Skills Pack                             */
/* ---------------------------------------- */

/**
 * Build item data array for skills compendium.
 * @returns {object[]}
 */
function _buildSkillItems() {
  const items = [];
  for (const [className, skills] of Object.entries(skillLibrary)) {
    for (const skill of skills) {
      const desc = resolveText(skill, 'description', 'descriptionKo');
      items.push({
        name: resolveName(skill),
        type: 'skill',
        system: {
          description: desc,
          skillClass: skill.skillClass || className,
          level: 1,
          maxLevel: skill.maxLevel ?? 1,
          timing: skill.timing || '',
          target: skill.target || '',
          range: skill.range || '',
          cost: skill.cost || '',
          effect: desc
        },
        flags: {
          arianrhod2e: { libraryId: skill.id }
        }
      });
    }
  }
  return items;
}

/* ---------------------------------------- */
/*  Equipment Pack                          */
/* ---------------------------------------- */

/**
 * Build a single weapon item data object.
 */
function _buildWeaponItem(w) {
  return {
    name: resolveName(w),
    type: 'weapon',
    system: {
      description: w.note || '',
      weaponType: w.category || '',
      accuracy: w.accuracy ?? 0,
      attack: w.attack ?? 0,
      range: w.range ?? 0,
      weight: w.weight ?? 0,
      price: w.price ?? 0,
      slot: w.slot || '',
      classRestriction: w.restriction || ''
    },
    flags: {
      arianrhod2e: { libraryId: w.id }
    }
  };
}

/**
 * Build a single armor item data object.
 */
function _buildArmorItem(a) {
  return {
    name: resolveName(a),
    type: 'armor',
    system: {
      description: a.note || '',
      armorType: a.category || '',
      physDef: a.physDef ?? 0,
      magDef: a.magDef ?? 0,
      evasion: a.evasion ?? 0,
      initiativeMod: a.initiativeMod ?? 0,
      movementMod: a.movementMod ?? 0,
      weight: a.weight ?? 0,
      price: a.price ?? 0,
      slot: a.category || '',
      classRestriction: a.restriction || ''
    },
    flags: {
      arianrhod2e: { libraryId: a.id }
    }
  };
}

/**
 * Build a single accessory item data object.
 */
function _buildAccessoryItem(acc) {
  const effect = resolveText(acc, 'effect', 'effectKo');
  return {
    name: resolveName(acc),
    type: 'accessory',
    system: {
      description: acc.note || '',
      effect: effect,
      weight: acc.weight ?? 0,
      price: acc.price ?? 0,
      classRestriction: acc.restriction || ''
    },
    flags: {
      arianrhod2e: { libraryId: acc.id }
    }
  };
}

/**
 * Build a single general item data object.
 */
function _buildGeneralItem(item) {
  const effect = resolveText(item, 'effect', 'effectKo');
  return {
    name: resolveName(item),
    type: 'item',
    system: {
      description: item.note || '',
      itemType: item.category || '',
      effect: effect,
      weight: item.weight ?? 0,
      price: item.price ?? 0,
      quantity: 1
    },
    flags: {
      arianrhod2e: { libraryId: item.id }
    }
  };
}

/**
 * Build item data array for equipment compendium.
 * @returns {object[]}
 */
function _buildEquipmentItems() {
  const items = [];
  for (const w of (equipmentLibrary.weapons || [])) items.push(_buildWeaponItem(w));
  for (const a of (equipmentLibrary.armor || [])) items.push(_buildArmorItem(a));
  for (const acc of (equipmentLibrary.accessories || [])) items.push(_buildAccessoryItem(acc));
  for (const item of (equipmentLibrary.items || [])) items.push(_buildGeneralItem(item));
  return items;
}

/* ---------------------------------------- */
/*  Enemy Skills Pack                       */
/* ---------------------------------------- */

/**
 * Build item data array for enemy skills compendium.
 * @returns {object[]}
 */
function _buildEnemySkillItems() {
  return enemySkillLibrary.map(skill => {
    const effect = resolveText(skill, 'effect', 'effectKo', 'effectEn');
    return {
      name: resolveName(skill),
      type: 'skill',
      system: {
        description: effect,
        skillClass: 'enemy',
        level: 1,
        maxLevel: skill.slLimit || 1,
        timing: skill.timing || '',
        target: skill.target || '',
        range: skill.range || '',
        cost: skill.cost || '',
        effect: effect
      },
      flags: {
        arianrhod2e: { libraryId: skill.id }
      }
    };
  });
}

/* ---------------------------------------- */
/*  Public API                              */
/* ---------------------------------------- */

/**
 * Populate all three compendium packs from library data.
 * Skips any pack that already contains items.
 */
export async function populateAllPacks() {
  const packs = [
    {
      key: 'arianrhod2e.skills',
      label: 'Skills',
      builder: _buildSkillItems
    },
    {
      key: 'arianrhod2e.equipment',
      label: 'Equipment',
      builder: _buildEquipmentItems
    },
    {
      key: 'arianrhod2e.enemy-skills',
      label: 'Enemy Skills',
      builder: _buildEnemySkillItems
    }
  ];

  for (const { key, label, builder } of packs) {
    const pack = game.packs.get(key);
    if (!pack) {
      ui.notifications.warn(`Compendium pack "${key}" not found. Skipping.`);
      continue;
    }

    // Check if already populated
    const index = await pack.getIndex();
    if (index.size > 0) {
      ui.notifications.info(`${label} compendium already populated (${index.size} items). Skipping.`);
      continue;
    }

    // Unlock the pack if locked
    const wasLocked = pack.locked;
    if (wasLocked) {
      await pack.configure({ locked: false });
    }

    // Build and create items
    try {
      const itemData = builder();
      ui.notifications.info(`Populating ${label} compendium with ${itemData.length} items...`);
      await Item.create(itemData, { pack: key });
      ui.notifications.info(`${label} compendium populated successfully (${itemData.length} items).`);
    } finally {
      // Re-lock if it was locked before
      if (wasLocked) {
        await pack.configure({ locked: true });
      }
    }
  }

  ui.notifications.info('All compendium packs population complete.');
}

/**
 * Clear all items in a specific compendium pack (for re-population).
 * @param {string} packName - Full pack key, e.g. "arianrhod2e.skills"
 */
export async function resetPack(packName) {
  const pack = game.packs.get(packName);
  if (!pack) {
    ui.notifications.error(`Compendium pack "${packName}" not found.`);
    return;
  }

  const index = await pack.getIndex();
  if (index.size === 0) {
    ui.notifications.info(`Pack "${packName}" is already empty.`);
    return;
  }

  // Unlock the pack if locked
  const wasLocked = pack.locked;
  if (wasLocked) {
    await pack.configure({ locked: false });
  }

  try {
    ui.notifications.info(`Clearing ${index.size} items from "${packName}"...`);
    const ids = index.map(e => e._id);
    await Item.deleteDocuments(ids, { pack: packName });
    ui.notifications.info(`Pack "${packName}" cleared successfully.`);
  } finally {
    if (wasLocked) {
      await pack.configure({ locked: true });
    }
  }
}
