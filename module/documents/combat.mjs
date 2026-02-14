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
}
