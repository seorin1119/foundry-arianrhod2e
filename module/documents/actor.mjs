import { rollCheckDialog, analyzeRoll } from "../dice.mjs";
import { validateAttackEngagement } from "../helpers/engagement.mjs";

const ATTACK_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/attack-card.hbs";
const DAMAGE_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/damage-card.hbs";

/**
 * Extend the base Actor document for Arianrhod RPG 2E.
 * @extends {Actor}
 */
export class ArianrhodActor extends Actor {

  /* -------------------------------------------- */
  /*  Ability Checks                              */
  /* -------------------------------------------- */

  async rollAbilityCheck(abilityKey, options = {}) {
    const ability = this.system.abilities[abilityKey];
    if (!ability) return;

    const label = game.i18n.localize(CONFIG.ARIANRHOD.abilities[abilityKey] ?? abilityKey);
    const checkLabel = game.i18n.localize("ARIANRHOD.Check");
    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    const maxFate = (fateEnabled && this.type === "character") ? this.system.fate.value : 0;

    return rollCheckDialog({
      title: `${label} ${checkLabel}`,
      modifier: ability.bonus,
      maxFate,
      label: `${label} ${checkLabel}`,
      actor: this,
    });
  }

  /* -------------------------------------------- */
  /*  Combat — Attack                             */
  /* -------------------------------------------- */

  /**
   * Roll an attack check and produce a rich chat card.
   * Card includes achievement value and a "Roll Damage" button.
   */
  async rollAttack(options = {}) {
    const equippedWeapons = this.items.filter(i => i.type === "weapon" && i.system.equipped);
    if (equippedWeapons.length === 0) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoWeaponEquipped"));
      return null;
    }

    let weapon = equippedWeapons[0];
    if (equippedWeapons.length > 1) {
      weapon = await this._selectWeapon(equippedWeapons);
      if (!weapon) return null;
    }

    // Engagement check for melee attacks
    if (game.combat?.started) {
      const targets = game.user.targets;
      const targetToken = targets.size > 0 ? targets.first() : null;
      const targetActor = targetToken?.actor;
      if (targetActor) {
        const isRanged = (weapon.system.range ?? 0) > 0;
        const engCheck = validateAttackEngagement(game.combat, this, targetActor, isRanged);
        if (!engCheck.allowed) {
          ui.notifications.warn(game.i18n.localize(engCheck.reason));
          return null;
        }
      }
    }

    const accuracy = this.system.combat?.accuracy ?? 0;
    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    const maxFate = (fateEnabled && this.type === "character") ? (this.system.fate?.value ?? 0) : 0;

    // Show roll dialog
    const dialogResult = await this._combatRollDialog({
      title: `${game.i18n.localize("ARIANRHOD.AttackRoll")} — ${weapon.name}`,
      modifier: accuracy,
      maxFate,
    });
    if (!dialogResult) return null;

    // Deduct fate
    if (dialogResult.fateDice > 0 && this.type === "character") {
      await this.update({ "system.fate.value": Math.max(0, this.system.fate.value - dialogResult.fateDice) });
    }

    // Build and evaluate roll
    let formula = "2d6";
    if (dialogResult.modifier > 0) formula += ` + ${dialogResult.modifier}`;
    else if (dialogResult.modifier < 0) formula += ` - ${Math.abs(dialogResult.modifier)}`;
    if (dialogResult.fateDice > 0) formula += ` + ${dialogResult.fateDice}d6`;

    const roll = new Roll(formula);
    await roll.evaluate();
    const { isCritical, isFumble, sixCount } = analyzeRoll(roll, dialogResult.fateDice);

    // Render attack card template
    const fateNotice = dialogResult.fateDice > 0
      ? game.i18n.format("ARIANRHOD.FateUsed", { count: dialogResult.fateDice })
      : "";

    const content = await renderTemplate(ATTACK_CARD_TEMPLATE, {
      weaponImg: weapon.img || "icons/svg/sword.svg",
      weaponName: weapon.name,
      total: roll.total,
      isCritical,
      isFumble,
      sixCount,
      fateDice: dialogResult.fateDice,
      fateNotice,
      actorId: this.id,
      weaponId: weapon.id,
    });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
    });

    return { roll, isCritical, isFumble, weapon };
  }

  /* -------------------------------------------- */
  /*  Combat — Damage                             */
  /* -------------------------------------------- */

  /**
   * Roll damage: 2d6 + weapon attack power (+ critical bonus).
   * If a target token is selected, calculates final damage vs defense.
   * @param {string} weaponId - Weapon item ID
   * @param {boolean} isCritical - Whether the attack was a critical hit
   */
  async rollDamage(weaponId, isCritical = false) {
    const weapon = weaponId
      ? this.items.get(weaponId)
      : this.items.find(i => i.type === "weapon" && i.system.equipped);
    if (!weapon) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoWeaponEquipped"));
      return null;
    }

    const weaponAttack = weapon.system.attack ?? 0;
    const weaponElement = weapon.system.element ?? "none";

    // Build damage formula: 2d6 + weapon attack power
    let formula = `2d6 + ${weaponAttack}`;
    if (isCritical) formula += " + 1d6"; // Critical adds extra die

    const roll = new Roll(formula);
    await roll.evaluate();

    // Get target info (if auto damage calc is enabled)
    const autoDamageCalc = game.settings?.get("arianrhod2e", "autoDamageCalc") ?? true;
    const targets = game.user.targets;
    const targetToken = autoDamageCalc && targets.size > 0 ? targets.first() : null;
    const targetActor = targetToken?.actor;
    const targetElement = targetActor?.system.element ?? "none";

    // Determine defense based on element affinity
    // Physical (no element / "none") → physDef
    // Elemental attack → magDef with affinity modifier:
    //   Same element → magDef × 2; Opposing → magDef × 0; Other → magDef × 1
    let defense = 0;
    let defenseLabel = "";
    let elementNote = "";
    const isMagical = weaponElement !== "none";

    if (targetActor) {
      if (isMagical) {
        const baseMagDef = targetActor.system.combat?.magDef ?? 0;
        const opposites = CONFIG.ARIANRHOD.elementOpposites;
        if (targetElement !== "none" && weaponElement === targetElement) {
          // Same element → reinforced (×2)
          defense = baseMagDef * 2;
          elementNote = game.i18n.localize("ARIANRHOD.ElementReinforced");
        } else if (targetElement !== "none" && opposites[weaponElement] === targetElement) {
          // Opposing element → negated (×0)
          defense = 0;
          elementNote = game.i18n.localize("ARIANRHOD.ElementWeak");
        } else {
          defense = baseMagDef;
        }
        defenseLabel = game.i18n.localize("ARIANRHOD.MagDef");
      } else {
        defense = targetActor.system.combat?.physDef ?? 0;
        defenseLabel = game.i18n.localize("ARIANRHOD.PhysDef");
      }
    }

    const rawDamage = roll.total;
    const finalDamage = targetActor ? Math.max(0, rawDamage - defense) : rawDamage;

    // Build element badge HTML
    const elementBadge = weaponElement !== "none"
      ? `<span class="ar-element-badge element-${weaponElement}">${game.i18n.localize(CONFIG.ARIANRHOD.elements[weaponElement])}</span>`
      : "";

    // Build element note HTML
    const elementNoteHtml = elementNote
      ? `<span class="ar-element-note">${elementNote}</span>`
      : "";

    // Render damage card template
    const content = await renderTemplate(DAMAGE_CARD_TEMPLATE, {
      weaponImg: weapon.img || "icons/svg/sword.svg",
      weaponName: weapon.name,
      elementBadge,
      isCritical,
      rawDamage,
      hasTarget: !!targetActor,
      defenseLabel,
      targetName: targetActor?.name ?? "",
      elementNote: elementNoteHtml,
      defense,
      finalDamage,
      targetId: targetActor?.id ?? "",
    });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
    });

    return { roll, rawDamage, finalDamage, targetActor };
  }

  /* -------------------------------------------- */
  /*  Combat — Evasion                            */
  /* -------------------------------------------- */

  /**
   * Roll an evasion check (2d6 + evasion modifier).
   */
  async rollEvasion(options = {}) {
    const evasion = this.system.combat?.evasion ?? 0;
    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    const maxFate = (fateEnabled && this.type === "character") ? (this.system.fate?.value ?? 0) : 0;

    return rollCheckDialog({
      title: game.i18n.localize("ARIANRHOD.EvasionRoll"),
      modifier: evasion,
      maxFate,
      label: game.i18n.localize("ARIANRHOD.EvasionRoll"),
      actor: this,
    });
  }

  /* -------------------------------------------- */
  /*  Damage Application                          */
  /* -------------------------------------------- */

  /**
   * Apply damage to this actor (reduce HP).
   * @param {number} amount - Amount of damage to apply
   */
  async applyDamage(amount) {
    if (amount <= 0) return;
    const hp = this.system.combat.hp;
    const newHp = Math.max(0, hp.value - amount);
    try {
      await this.update({ "system.combat.hp.value": newHp });
    } catch (err) {
      // Foundry v13 may throw RenderFlags error when canvas is not initialized
      if (!err.message?.includes("OBJECTS")) throw err;
    }

    // Remove sleep on damage (removedOnDamage flag)
    if (this.hasStatusEffect?.("sleep")) {
      await this.toggleStatusEffect("sleep");
      ui.notifications.info(game.i18n.format("ARIANRHOD.SleepBrokenByDamage", { name: this.name }));
    }

    // Notify incapacitation
    const autoIncapacitation = game.settings?.get("arianrhod2e", "autoIncapacitation") ?? true;
    if (newHp === 0 && autoIncapacitation) {
      ui.notifications.warn(game.i18n.format("ARIANRHOD.Incapacitated", { name: this.name }));
    }
  }

  /* -------------------------------------------- */
  /*  Status Effects                              */
  /* -------------------------------------------- */

  async toggleStatusEffect(statusId) {
    const existing = this.effects.find(e => e.statuses.has(statusId));
    if (existing) {
      try {
        await existing.delete();
      } catch (err) {
        // Foundry v13 may throw RenderFlags error when canvas is not initialized
        if (!err.message?.includes("OBJECTS")) throw err;
      }
      return undefined;
    }

    const statusDef = CONFIG.statusEffects.find(s => s.id === statusId);
    if (!statusDef) return undefined;

    const effectData = {
      name: game.i18n.localize(statusDef.name),
      icon: statusDef.icon,
      statuses: [statusId],
      changes: statusDef.changes ?? [],
      flags: statusDef.flags ?? {}
    };

    try {
      const created = await this.createEmbeddedDocuments("ActiveEffect", [effectData]);
      return created[0];
    } catch (err) {
      // Foundry v13 may throw RenderFlags error when canvas is not initialized
      if (!err.message?.includes("OBJECTS")) throw err;
      // Effect was likely created successfully on the server; refetch
      return this.effects.find(e => e.statuses.has(statusId));
    }
  }

  hasStatusEffect(statusId) {
    return this.effects.some(e => e.statuses.has(statusId));
  }

  getStatusEffects() {
    return this.effects.filter(e => e.statuses.size > 0);
  }

  /* -------------------------------------------- */
  /*  Incapacitation                              */
  /* -------------------------------------------- */

  /**
   * Check if this actor is incapacitated (HP=0).
   * @returns {boolean}
   */
  isIncapacitated() {
    return (this.system.combat?.hp?.value ?? 1) <= 0;
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Show a combat roll dialog (modifier + fate dice).
   */
  async _combatRollDialog({ title, modifier = 0, maxFate = 0 }) {
    const content = `<form>
      <div class="form-group">
        <label>${game.i18n.localize("ARIANRHOD.Modifier")}</label>
        <input type="number" name="modifier" value="${modifier}" />
      </div>
      ${maxFate > 0 ? `<div class="form-group">
        <label>${game.i18n.localize("ARIANRHOD.FateDice")} (${game.i18n.localize("ARIANRHOD.Max")}: ${maxFate})</label>
        <input type="number" name="fateDice" value="0" min="0" max="${maxFate}" />
      </div>` : ""}
    </form>`;

    return foundry.applications.api.DialogV2.prompt({
      window: { title },
      content,
      ok: {
        icon: "fas fa-dice",
        label: game.i18n.localize("ARIANRHOD.Roll"),
        callback: (event, button) => ({
          modifier: parseInt(button.form.querySelector('[name="modifier"]').value) || 0,
          fateDice: Math.min(parseInt(button.form.querySelector('[name="fateDice"]')?.value) || 0, maxFate),
        }),
      },
      rejectClose: false,
    });
  }

  /**
   * Prompt user to select a weapon from multiple equipped weapons.
   */
  async _selectWeapon(weapons) {
    const opts = weapons.map(w =>
      `<option value="${w.id}">${w.name} (${game.i18n.localize("ARIANRHOD.Attack")}: ${w.system.attack})</option>`
    ).join("");

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("ARIANRHOD.SelectWeapon") },
      content: `<form><div class="form-group"><label>${game.i18n.localize("ARIANRHOD.SelectWeapon")}</label><select name="weaponId">${opts}</select></div></form>`,
      ok: {
        label: game.i18n.localize("ARIANRHOD.Confirm"),
        callback: (event, button) => button.form.querySelector('[name="weaponId"]').value,
      },
      rejectClose: false,
    });

    return result ? this.items.get(result) : null;
  }
}
