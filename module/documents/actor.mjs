import { rollCheckDialog, analyzeRoll } from "../dice.mjs";

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
    const maxFate = this.type === "character" ? this.system.fate.value : 0;

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

    const accuracy = this.system.combat?.accuracy ?? 0;
    const maxFate = this.type === "character" ? (this.system.fate?.value ?? 0) : 0;

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

    // Build flavor
    let flavor = `<strong>${game.i18n.localize("ARIANRHOD.AttackRoll")}</strong> — ${weapon.name}`;
    if (isCritical) flavor += ` <span class="ar-critical">${game.i18n.localize("ARIANRHOD.Critical")}! (6×${sixCount})</span>`;
    else if (isFumble) flavor += ` <span class="ar-fumble">${game.i18n.localize("ARIANRHOD.Fumble")}!</span>`;
    if (dialogResult.fateDice > 0) flavor += ` <span class="ar-fate-used">(${game.i18n.format("ARIANRHOD.FateUsed", { count: dialogResult.fateDice })})</span>`;

    // Build card content with damage button
    const content = `<div class="ar-combat-card">
      <div class="ar-card-row">
        <span class="ar-card-label">${game.i18n.localize("ARIANRHOD.Achievement")}</span>
        <span class="ar-card-value ${isCritical ? "critical" : ""} ${isFumble ? "fumble" : ""}">${roll.total}</span>
      </div>
      <div class="ar-card-actions">
        <button type="button" class="ar-chat-btn ar-damage-btn"
                data-actor-id="${this.id}"
                data-weapon-id="${weapon.id}"
                data-critical="${isCritical}">
          <i class="fas fa-burst"></i> ${game.i18n.localize("ARIANRHOD.RollDamage")}
        </button>
      </div>
    </div>`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor,
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

    // Get target info
    const targets = game.user.targets;
    const targetToken = targets.size > 0 ? targets.first() : null;
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

    // Build flavor
    const elementLabel = weaponElement !== "none"
      ? ` <span class="ar-element-badge element-${weaponElement}">${game.i18n.localize(CONFIG.ARIANRHOD.elements[weaponElement])}</span>`
      : "";
    let flavor = `<strong>${game.i18n.localize("ARIANRHOD.DamageRoll")}</strong> — ${weapon.name}${elementLabel}`;
    if (isCritical) flavor += ` <span class="ar-critical">${game.i18n.localize("ARIANRHOD.CriticalHit")}</span>`;

    // Build card content
    let targetHtml = "";
    if (targetActor) {
      const elementNoteHtml = elementNote ? ` <span class="ar-element-note">${elementNote}</span>` : "";
      targetHtml = `
        <div class="ar-card-row ar-card-defense">
          <span class="ar-card-label">vs ${defenseLabel} (${targetActor.name})${elementNoteHtml}</span>
          <span class="ar-card-value">-${defense}</span>
        </div>
        <div class="ar-card-row ar-card-final">
          <span class="ar-card-label">${game.i18n.localize("ARIANRHOD.FinalDamage")}</span>
          <span class="ar-card-value ar-final-damage">${finalDamage}</span>
        </div>
        <div class="ar-card-actions">
          <button type="button" class="ar-chat-btn ar-apply-btn"
                  data-target-id="${targetActor.id}"
                  data-damage="${finalDamage}">
            <i class="fas fa-heart-crack"></i> ${game.i18n.localize("ARIANRHOD.ApplyDamage")} (${finalDamage})
          </button>
        </div>`;
    } else {
      targetHtml = `
        <div class="ar-card-row ar-card-hint">
          <span class="ar-card-label ar-hint">${game.i18n.localize("ARIANRHOD.SelectTargetHint")}</span>
        </div>`;
    }

    const content = `<div class="ar-combat-card ar-damage-card">
      <div class="ar-card-row">
        <span class="ar-card-label">${game.i18n.localize("ARIANRHOD.DamageTotal")}</span>
        <span class="ar-card-value">${rawDamage}</span>
      </div>
      ${targetHtml}
    </div>`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor,
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
    const maxFate = this.type === "character" ? (this.system.fate?.value ?? 0) : 0;

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
    await this.update({ "system.combat.hp.value": newHp });

    // Notify incapacitation
    if (newHp === 0) {
      ui.notifications.warn(game.i18n.format("ARIANRHOD.Incapacitated", { name: this.name }));
    }
  }

  /* -------------------------------------------- */
  /*  Status Effects                              */
  /* -------------------------------------------- */

  async toggleStatusEffect(statusId) {
    const existing = this.effects.find(e => e.statuses.has(statusId));
    if (existing) {
      await existing.delete();
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

    const created = await this.createEmbeddedDocuments("ActiveEffect", [effectData]);
    return created[0];
  }

  hasStatusEffect(statusId) {
    return this.effects.some(e => e.statuses.has(statusId));
  }

  getStatusEffects() {
    return this.effects.filter(e => e.statuses.size > 0);
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
