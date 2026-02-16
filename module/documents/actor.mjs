import { rollCheckDialog, analyzeRoll } from "../dice.mjs";
import { validateAttackEngagement } from "../helpers/engagement.mjs";
import { isSurprised } from "../helpers/combat-manager.mjs";

const ATTACK_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/attack-card.hbs";
const DAMAGE_CARD_TEMPLATE = "systems/arianrhod2e/templates/chat/damage-card.hbs";

/**
 * Extend the base Actor document for Arianrhod RPG 2E.
 * @extends {Actor}
 */
export class ArianrhodActor extends Actor {

  /* -------------------------------------------- */
  /*  Document Lifecycle                          */
  /* -------------------------------------------- */

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    // Intercept enemy creation to show the library dialog
    if (data.type === "enemy" && !data.flags?.arianrhod2e?.fromLibrary) {
      const { EnemyCreationDialog } = await import("../apps/enemy-creation-dialog.mjs");
      new EnemyCreationDialog(data).render(true);
      return false; // Cancel the default creation
    }
  }

  /** @override */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    // Block HP increase when incapacitated (HP=0), unless explicitly recovering
    // Per rulebook p.227: incapacitated actors cannot receive HP healing
    if (!options.arianrhod2e?.incapacitationRecovery) {
      const newHP = foundry.utils.getProperty(changed, "system.combat.hp.value");
      if (newHP !== undefined && newHP > 0) {
        const currentHP = this.system.combat?.hp?.value;
        if (currentHP === 0) {
          // Block the HP increase
          ui.notifications.warn(game.i18n.format("ARIANRHOD.HealBlockedIncapacitated", { name: this.name }));
          delete changed.system.combat.hp.value;
          return;
        }
      }
    }
  }

  /* -------------------------------------------- */
  /*  Ability Checks                              */
  /* -------------------------------------------- */

  async rollAbilityCheck(abilityKey, options = {}) {
    const ability = this.system.abilities[abilityKey];
    if (!ability) return;

    const label = game.i18n.localize(CONFIG.ARIANRHOD.abilities[abilityKey] ?? abilityKey);
    const checkLabel = game.i18n.localize("ARIANRHOD.Check");
    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    const maxFate = (fateEnabled && this.type === "character")
      ? Math.min(this.system.fate.value, this.system.abilities?.luk?.bonus ?? 0)
      : 0;

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
    let weapon;
    let isEnemyNaturalAttack = false;

    if (this.type === "enemy") {
      // Enemies use their combat stats directly (natural attack)
      // Check if the enemy has equipped weapon items first, otherwise use stats
      const equippedWeapons = this.items.filter(i => i.type === "weapon" && i.system.equipped);
      if (equippedWeapons.length > 0) {
        weapon = equippedWeapons[0];
      } else {
        // Create a virtual weapon object from enemy combat stats
        isEnemyNaturalAttack = true;
        const pattern = this.system.attackPattern || game.i18n.localize("ARIANRHOD.NaturalAttack");
        weapon = {
          name: pattern,
          img: this.img || "icons/svg/sword.svg",
          id: null,
          system: {
            accuracy: 0, // accuracy is already in combat.accuracy
            attack: this.system.combat?.attack ?? 0,
            range: 0,
            element: this.system.element ?? "none",
          },
        };
      }
    } else {
      // Characters must have an equipped weapon
      const equippedWeapons = this.items.filter(i => i.type === "weapon" && i.system.equipped);
      if (equippedWeapons.length === 0) {
        ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoWeaponEquipped"));
        return null;
      }
      weapon = equippedWeapons[0];
      if (equippedWeapons.length > 1) {
        weapon = await this._selectWeapon(equippedWeapons);
        if (!weapon) return null;
      }
    }

    // Calculate effective range for throwing weapons: STR bonus + 5m (rulebook p.223)
    const effectiveRange = weapon.system.weaponType === "throwing"
      ? (this.system.abilities?.str?.bonus ?? 0) + 5
      : (weapon.system.range ?? 0);

    // Engagement check for melee attacks
    if (game.combat?.started) {
      const targets = game.user.targets;
      const targetToken = targets.size > 0 ? targets.first() : null;
      const targetActor = targetToken?.actor;
      if (targetActor) {
        const isRanged = effectiveRange > 0;
        const engCheck = validateAttackEngagement(game.combat, this, targetActor, isRanged);
        if (!engCheck.allowed) {
          ui.notifications.warn(game.i18n.localize(engCheck.reason));
          return null;
        }
      }
    }

    const accuracy = this.system.combat?.accuracy ?? 0;
    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    // Max fate per roll = min(current fate, LUK bonus) per rulebook
    const maxFate = (fateEnabled && this.type === "character")
      ? Math.min(this.system.fate?.value ?? 0, this.system.abilities?.luk?.bonus ?? 0)
      : 0;

    // Calculate dice penalties from bad statuses (attack = major action)
    let baseDice = 2;
    const penalties = [];
    if (this.hasStatusEffect?.("offguard")) {
      baseDice -= 1;
      penalties.push(game.i18n.localize("ARIANRHOD.StatusOffguard") + " (-1D)");
    }
    if (this.hasStatusEffect?.("rage")) {
      baseDice -= 2;
      penalties.push(game.i18n.localize("ARIANRHOD.StatusRage") + " (-2D)");
    }
    baseDice = Math.max(1, baseDice);
    const dicePenaltyNote = penalties.length > 0 ? penalties.join(", ") : "";

    // Show roll dialog
    const dialogResult = await this._combatRollDialog({
      title: `${game.i18n.localize("ARIANRHOD.AttackRoll")} — ${weapon.name}`,
      modifier: accuracy,
      maxFate,
      dicePenaltyNote,
    });
    if (!dialogResult) return null;

    // Deduct fate
    if (dialogResult.fateDice > 0 && this.type === "character") {
      await this.update({ "system.fate.value": Math.max(0, this.system.fate.value - dialogResult.fateDice) });
    }

    // Build and evaluate roll (baseDice may be reduced by status penalties)
    let formula = `${baseDice}d6`;
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

    // Check if fate re-roll is available (character with fate > 0, not already a reroll)
    const canReroll = this.type === "character" && (this.system.fate?.value ?? 0) > 0 && !options.isReroll;

    // Get target info for evasion response buttons (supports multiple targets for area attacks)
    const attackTargets = game.user.targets;
    const targets = [];
    for (const token of attackTargets) {
      if (token.actor) targets.push({ id: token.actor.id, name: token.actor.name });
    }

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
      weaponId: weapon.id ?? "",
      targets,
      isReroll: !!options.isReroll,
      canReroll,
      formula,
      baseDice,
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
  async rollDamage(weaponId, isCritical = false, sixCount = 0, { damageType = "auto" } = {}) {
    let weapon;
    // Magic attack virtual weapon
    if (weaponId === "__magic__") {
      weapon = {
        name: game.i18n.localize("ARIANRHOD.MagicAttack"),
        img: "icons/svg/fire.svg",
        system: {
          attack: this.system.combat?.magAttack ?? 0,
          range: 0,
          element: this.system.element ?? "none",
        },
      };
    }
    if (!weapon && weaponId) {
      weapon = this.items.get(weaponId);
    }
    if (!weapon) {
      weapon = this.items.find(i => i.type === "weapon" && i.system.equipped);
    }
    // For enemies without weapon items, create a virtual weapon from combat stats
    if (!weapon && this.type === "enemy") {
      const pattern = this.system.attackPattern || game.i18n.localize("ARIANRHOD.NaturalAttack");
      weapon = {
        name: pattern,
        img: this.img || "icons/svg/sword.svg",
        system: {
          attack: this.system.combat?.attack ?? 0,
          range: 0,
          element: this.system.element ?? "none",
        },
      };
    }
    if (!weapon) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoWeaponEquipped"));
      return null;
    }

    const weaponAttack = weapon.system.attack ?? 0;
    const weaponElement = weapon.system.element ?? "none";

    // Build damage formula: 2d6 + weapon attack power
    let formula = `2d6 + ${weaponAttack}`;
    // Critical: add dice equal to the number of 6s rolled on the attack (rulebook p.224)
    if (isCritical && sixCount > 0) formula += ` + ${sixCount}d6`;

    const roll = new Roll(formula);
    await roll.evaluate();

    // Get target info (if auto damage calc is enabled)
    const autoDamageCalc = game.settings?.get("arianrhod2e", "autoDamageCalc") ?? true;
    const targets = game.user.targets;
    const targetToken = autoDamageCalc && targets.size > 0 ? targets.first() : null;
    const targetActor = targetToken?.actor;
    const targetElement = targetActor?.system.element ?? "none";

    // Determine defense based on damage type and element affinity
    // Penetration damage → ignores all defense (rulebook p.224)
    // Physical (no element / "none") → physDef
    // Elemental attack → magDef with affinity modifier:
    //   Same element → magDef × 2; Opposing → magDef × 0; Other → magDef × 1
    let defense = 0;
    let defenseLabel = "";
    let elementNote = "";
    const isPenetration = damageType === "penetration";
    const isMagical = !isPenetration && weaponElement !== "none";

    if (targetActor && !isPenetration) {
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
    } else if (isPenetration && targetActor) {
      defenseLabel = game.i18n.localize("ARIANRHOD.Penetration");
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

    // Check if cover is possible: target is in an engagement with allies (rulebook p.226)
    let canCover = false;
    if (targetActor && game.combat?.started) {
      const { getEngagedWith } = await import("../helpers/engagement.mjs");
      const targetCombatant = game.combat.combatants.find(c => c.actor?.id === targetActor.id);
      if (targetCombatant) {
        const engagedIds = getEngagedWith(game.combat, targetCombatant.id);
        // Check if any engaged combatant is an ally (same type) that hasn't acted
        canCover = engagedIds.some(id => {
          const c = game.combat.combatants.get(id);
          return c?.actor && c.actor.id !== targetActor.id && c.actor.type === targetActor.type;
        });
      }
    }

    // Render damage card template
    const content = await renderTemplate(DAMAGE_CARD_TEMPLATE, {
      weaponImg: weapon.img || "icons/svg/sword.svg",
      weaponName: weapon.name,
      elementBadge,
      isCritical,
      isPenetration,
      rawDamage,
      hasTarget: !!targetActor,
      defenseLabel,
      targetName: targetActor?.name ?? "",
      elementNote: elementNoteHtml,
      defense,
      finalDamage,
      targetId: targetActor?.id ?? "",
      canCover,
    });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
    });

    return { roll, rawDamage, finalDamage, targetActor };
  }

  /* -------------------------------------------- */
  /*  Combat — Magic Attack                       */
  /* -------------------------------------------- */

  /**
   * Roll a magic attack check using INT ability (2d6 + INT bonus).
   * Per rulebook: magic attacks use [知力/INT] check, not standard accuracy.
   * Damage uses magAttack stat instead of weapon attack.
   */
  async rollMagicAttack(options = {}) {
    // Magic accuracy = INT bonus (for characters) or combat.accuracy (for enemies)
    const intBonus = this.system.abilities?.int?.bonus ?? 0;
    const magAccuracy = this.type === "enemy" ? (this.system.combat?.accuracy ?? 0) : intBonus;
    const magAttack = this.system.combat?.magAttack ?? 0;
    const element = this.system.element ?? "none";

    const fateEnabled = game.settings?.get("arianrhod2e", "fateEnabled") ?? true;
    const maxFate = (fateEnabled && this.type === "character")
      ? Math.min(this.system.fate?.value ?? 0, this.system.abilities?.luk?.bonus ?? 0)
      : 0;

    // Dice penalties from bad statuses
    let baseDice = 2;
    const penalties = [];
    if (this.hasStatusEffect?.("offguard")) {
      baseDice -= 1;
      penalties.push(game.i18n.localize("ARIANRHOD.StatusOffguard") + " (-1D)");
    }
    baseDice = Math.max(1, baseDice);
    const dicePenaltyNote = penalties.length > 0 ? penalties.join(", ") : "";

    // Show roll dialog
    const dialogResult = await this._combatRollDialog({
      title: `${game.i18n.localize("ARIANRHOD.MagicAttackRoll")}`,
      modifier: magAccuracy,
      maxFate,
      dicePenaltyNote,
    });
    if (!dialogResult) return null;

    // Deduct fate
    if (dialogResult.fateDice > 0 && this.type === "character") {
      await this.update({ "system.fate.value": Math.max(0, this.system.fate.value - dialogResult.fateDice) });
    }

    // Build and evaluate roll
    let formula = `${baseDice}d6`;
    if (dialogResult.modifier > 0) formula += ` + ${dialogResult.modifier}`;
    else if (dialogResult.modifier < 0) formula += ` - ${Math.abs(dialogResult.modifier)}`;
    if (dialogResult.fateDice > 0) formula += ` + ${dialogResult.fateDice}d6`;

    const roll = new Roll(formula);
    await roll.evaluate();
    const { isCritical, isFumble, sixCount } = analyzeRoll(roll, dialogResult.fateDice);

    const fateNotice = dialogResult.fateDice > 0
      ? game.i18n.format("ARIANRHOD.FateUsed", { count: dialogResult.fateDice })
      : "";
    const canReroll = this.type === "character" && (this.system.fate?.value ?? 0) > 0 && !options.isReroll;

    const content = await renderTemplate(ATTACK_CARD_TEMPLATE, {
      weaponImg: "icons/svg/fire.svg",
      weaponName: game.i18n.localize("ARIANRHOD.MagicAttack"),
      total: roll.total,
      isCritical,
      isFumble,
      sixCount,
      fateDice: dialogResult.fateDice,
      fateNotice,
      actorId: this.id,
      weaponId: "__magic__",
      isReroll: !!options.isReroll,
      canReroll,
      formula,
      baseDice,
    });

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
    });

    return { roll, isCritical, isFumble, weapon: { name: game.i18n.localize("ARIANRHOD.MagicAttack"), system: { attack: magAttack, element } } };
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
    const maxFate = (fateEnabled && this.type === "character")
      ? Math.min(this.system.fate?.value ?? 0, this.system.abilities?.luk?.bonus ?? 0)
      : 0;

    // Stun & surprise penalties: -1D on reaction checks (evasion is a reaction)
    let baseDice = 2;
    const penalties = [];
    if (this.hasStatusEffect?.("stun")) {
      baseDice -= 1;
      penalties.push(game.i18n.localize("ARIANRHOD.StatusStun") + " (-1D)");
    }
    // Surprise attack: -1D on reactions for surprised side (rulebook p.240)
    if (isSurprised(this)) {
      // Alertness skill negates surprise penalty
      const hasAlertness = this.items?.some(i => i.type === "skill" && i.system?.effectId === "alertness");
      if (!hasAlertness) {
        baseDice -= 1;
        penalties.push(game.i18n.localize("ARIANRHOD.SurpriseAttack") + " (-1D)");
      }
    }
    baseDice = Math.max(1, baseDice);
    const dicePenaltyNote = penalties.join(", ");

    return rollCheckDialog({
      title: game.i18n.localize("ARIANRHOD.EvasionRoll"),
      modifier: evasion,
      maxFate,
      baseDice,
      dicePenaltyNote,
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
   * @param {object} [options={}] - Options
   * @param {boolean} [options.coupDeGrace=false] - Whether this is a coup de grace (最後の一撃)
   */
  async applyDamage(amount, { coupDeGrace = false } = {}) {
    if (this.system.dead) return; // Already dead
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

    // Coup de grace: if target was incapacitated (HP=0) and receives damage, they die (rulebook p.227)
    if (coupDeGrace && hp.value === 0 && amount > 0) {
      await this.update({ "system.dead": true });
      ui.notifications.error(game.i18n.format("ARIANRHOD.ActorDied", { name: this.name }));
      return;
    }

    // Notify incapacitation
    const autoIncapacitation = game.settings?.get("arianrhod2e", "autoIncapacitation") ?? true;
    if (newHp === 0 && autoIncapacitation) {
      ui.notifications.warn(game.i18n.format("ARIANRHOD.Incapacitated", { name: this.name }));
      // Auto-roll drop items for enemies (rulebook p.238)
      if (this.type === "enemy" && this.system.drops) {
        await this.rollDropItems();
      }
    }
  }

  /**
   * Declare coup de grace (最後の一撃) on an incapacitated target.
   * Requires a free action to declare, then a major action dealing damage kills the target.
   */
  async declareCoupDeGrace() {
    if (this.system.combat?.hp?.value !== 0) {
      ui.notifications.warn(game.i18n.format("ARIANRHOD.CoupDeGraceRequiresIncapacitated", { name: this.name }));
      return false;
    }
    if (this.system.dead) {
      ui.notifications.warn(game.i18n.format("ARIANRHOD.AlreadyDead", { name: this.name }));
      return false;
    }
    // Set a flag to mark this actor as targeted for coup de grace
    await this.setFlag("arianrhod2e", "coupDeGrace", true);
    ui.notifications.info(game.i18n.format("ARIANRHOD.CoupDeGraceDeclared", { name: this.name }));

    // Post to chat
    await ChatMessage.create({
      content: `<div class="ar-combat-card"><div class="ar-card-badge ar-badge-death"><i class="fas fa-skull"></i> ${game.i18n.format("ARIANRHOD.CoupDeGraceDeclared", { name: this.name })}</div></div>`,
      speaker: ChatMessage.getSpeaker(),
    });
    return true;
  }

  /**
   * Roll drop items for a defeated enemy (rulebook p.238).
   * Parses the drops string and rolls 2D6 to determine the drop.
   */
  async rollDropItems() {
    const dropsStr = this.system.drops;
    if (!dropsStr) return;

    // Parse drops string: "6~8: item(price) / 9~12: item(price)×qty / 13~: item(price)"
    const entries = dropsStr.split(/\s*\/\s*/);
    const dropTable = [];
    for (const entry of entries) {
      const match = entry.match(/^(\d+)~(\d*)\s*:\s*(.+)$/);
      if (!match) continue;
      const min = parseInt(match[1]);
      const max = match[2] ? parseInt(match[2]) : 99; // "13~" means 13+
      dropTable.push({ min, max, item: match[3].trim() });
    }
    if (dropTable.length === 0) return;

    // Roll 2D6
    const roll = new Roll("2d6");
    await roll.evaluate();
    const total = roll.total;

    // Find matching drop
    const drop = dropTable.find(d => total >= d.min && total <= d.max);
    const dropResult = drop ? drop.item : game.i18n.localize("ARIANRHOD.DropNothing");

    // Build drop table display
    const tableRows = dropTable.map(d => {
      const rangeStr = d.max >= 99 ? `${d.min}+` : `${d.min}~${d.max}`;
      const isMatch = drop && d.min === drop.min;
      return `<div class="ar-drop-row${isMatch ? " ar-drop-match" : ""}"><span class="ar-drop-range">${rangeStr}</span><span class="ar-drop-item">${d.item}</span></div>`;
    }).join("");

    const content = `<div class="ar-combat-card ar-drop-card">
      <header class="ar-card-header">
        <img class="ar-card-icon" src="${this.img || "icons/svg/chest.svg"}" width="32" height="32" />
        <div class="ar-card-title">
          <h3>${game.i18n.localize("ARIANRHOD.DropItemRoll")}</h3>
          <span class="ar-card-subtitle">${this.name}</span>
        </div>
      </header>
      <div class="ar-card-row">
        <span class="ar-card-label">2D6</span>
        <span class="ar-card-value">${total}</span>
      </div>
      <div class="ar-drop-table">${tableRows}</div>
      <div class="ar-card-row ar-card-final">
        <span class="ar-card-label">${game.i18n.localize("ARIANRHOD.DropResult")}</span>
        <span class="ar-card-value">${dropResult}</span>
      </div>
    </div>`;

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content,
    });
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
  /*  Mount / Ride (rulebook p.242)               */
  /* -------------------------------------------- */

  /**
   * Mount a ride target. Uses a minor action.
   * @param {Actor} mount - The mount actor to ride
   */
  async mountRide(mount) {
    if (!mount || mount.id === this.id) return;
    // Check if already mounted
    if (this.getFlag("arianrhod2e", "mountId")) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.AlreadyMounted"));
      return;
    }
    await this.setFlag("arianrhod2e", "mountId", mount.id);
    await mount.setFlag("arianrhod2e", "riderId", this.id);

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="arianrhod ar-move-msg"><i class="fas fa-horse"></i> ${this.name}: ${game.i18n.format("ARIANRHOD.Mounted", { mount: mount.name })}</div>`,
    });
  }

  /**
   * Dismount from current mount. Uses a minor action.
   */
  async dismount() {
    const mountId = this.getFlag("arianrhod2e", "mountId");
    if (!mountId) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NotMounted"));
      return;
    }
    const mount = game.actors.get(mountId);
    await this.unsetFlag("arianrhod2e", "mountId");
    if (mount) {
      await mount.unsetFlag("arianrhod2e", "riderId");
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `<div class="arianrhod ar-move-msg"><i class="fas fa-horse"></i> ${this.name}: ${game.i18n.format("ARIANRHOD.Dismounted", { mount: mount?.name ?? "?" })}</div>`,
    });
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  /**
   * Show a combat roll dialog (modifier + fate dice).
   */
  async _combatRollDialog({ title, modifier = 0, maxFate = 0, dicePenaltyNote = "" }) {
    const penaltyHtml = dicePenaltyNote
      ? `<div class="form-group" style="color:#dc2626;font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> ${dicePenaltyNote}</div>`
      : "";
    const content = `<form>
      ${penaltyHtml}
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
