/**
 * Combat Skill Panel - Quick skill activation panel during combat.
 * Shows as a floating panel on the right side during the active combatant's turn.
 * Displays action economy status, skill list with filters, and one-click activation.
 */

import { getActionState, getActionSummary, getTimingAction, canPerformAction } from "../helpers/action-economy.mjs";
import { parseSkillCost, activateSkill } from "../helpers/skill-activation.mjs";

/** @type {CombatSkillPanel|null} */
let _instance = null;

/** Timing keys that represent activatable actions */
const ACTIVATABLE_TIMINGS = ["action", "minor", "move", "free", "reaction"];

/** Filter tab definitions */
const FILTER_TABS = [
  { key: "all", icon: "fas fa-list", labelKey: "ARIANRHOD.AllSkills" },
  { key: "action", icon: "fas fa-hand-fist", labelKey: "ARIANRHOD.TimingAction" },
  { key: "minor", icon: "fas fa-hand-sparkles", labelKey: "ARIANRHOD.TimingMinor" },
  { key: "free", icon: "fas fa-feather", labelKey: "ARIANRHOD.TimingFree" },
  { key: "reaction", icon: "fas fa-shield-halved", labelKey: "ARIANRHOD.TimingReaction" },
];

class CombatSkillPanel {
  /** @type {HTMLElement|null} */
  #el = null;
  #visible = false;
  #activeFilter = "all";

  get isVisible() { return this.#visible; }

  show(combat) {
    if (!this.#el) {
      this.#el = document.createElement("div");
      this.#el.id = "ar-skill-panel";
      document.getElementById("interface")?.appendChild(this.#el);
    }
    this.#visible = true;
    this.#el.classList.add("visible");
    this.refresh(combat);
  }

  hide() {
    if (this.#el) {
      this.#el.remove();
      this.#el = null;
    }
    this.#visible = false;
  }

  toggle(combat) {
    if (this.#visible) this.hide();
    else this.show(combat);
  }

  refresh(combat) {
    if (!this.#el || !this.#visible || !combat?.started) return;

    const combatant = combat.combatant;
    if (!combatant?.actor?.isOwner) {
      this.#el.innerHTML = "";
      return;
    }

    const actor = combatant.actor;
    const allSkills = actor.items.filter(i => i.type === "skill");
    const activatableSkills = allSkills.filter(i => ACTIVATABLE_TIMINGS.includes(i.system.timing));

    // Action economy state
    const state = getActionState(combatant);
    const summary = getActionSummary(state);

    // MP info
    const mp = actor.system.combat?.mp;
    const hp = actor.system.combat?.hp;

    let html = "";

    // ── Header with actor name + close button ──
    html += `<div class="ar-sp-header">`;
    html += `<img src="${actor.img}" width="28" height="28" />`;
    html += `<span class="ar-sp-actor-name">${actor.name}</span>`;
    html += `<button class="ar-sp-close" title="Close"><i class="fas fa-times"></i></button>`;
    html += `</div>`;

    // ── Action economy badges ──
    html += `<div class="ar-sp-actions">`;
    html += this.#badge("Mj", summary.majorAvailable, "ARIANRHOD.TimingAction");
    html += this.#badge("Mn", summary.minorAvailable, "ARIANRHOD.TimingMinor");
    html += this.#badge("Mv", summary.moveAvailable, "ARIANRHOD.TimingMove");
    if (mp) {
      const mpPct = mp.max > 0 ? Math.round((mp.value / mp.max) * 100) : 0;
      const mpColor = mpPct > 50 ? "" : mpPct > 25 ? " low" : " critical";
      html += `<span class="ar-sp-resource${mpColor}">MP ${mp.value}/${mp.max}</span>`;
    }
    html += `</div>`;

    // ── Filter tabs ──
    html += `<div class="ar-sp-filters">`;
    for (const tab of FILTER_TABS) {
      const count = tab.key === "all"
        ? activatableSkills.length
        : activatableSkills.filter(s => s.system.timing === tab.key).length;
      if (tab.key !== "all" && count === 0) continue; // Hide empty filter tabs
      const active = this.#activeFilter === tab.key ? " active" : "";
      const label = game.i18n.localize(tab.labelKey);
      html += `<button class="ar-sp-filter-btn${active}" data-filter="${tab.key}" title="${label}">`;
      html += `<i class="${tab.icon}"></i> ${count}`;
      html += `</button>`;
    }
    html += `</div>`;

    // ── Skill list ──
    html += `<div class="ar-sp-list">`;

    const filtered = this.#activeFilter === "all"
      ? activatableSkills
      : activatableSkills.filter(s => s.system.timing === this.#activeFilter);

    // Sort: available first, then by timing priority
    const timingOrder = { action: 0, minor: 1, move: 2, free: 3, reaction: 4 };
    const sorted = [...filtered].sort((a, b) => {
      const aDisabled = this.#isDisabled(a, state, actor);
      const bDisabled = this.#isDisabled(b, state, actor);
      if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
      return (timingOrder[a.system.timing] ?? 9) - (timingOrder[b.system.timing] ?? 9);
    });

    for (const skill of sorted) {
      const { disabled, reason } = this.#getDisabledInfo(skill, state, actor);
      const timing = skill.system.timing;
      const cost = parseSkillCost(skill.system.cost, skill.system.level ?? 1);
      const costStr = cost.mp > 0 ? `MP${cost.mp}` : cost.hp > 0 ? `HP${cost.hp}` : "-";
      const timingLabel = game.i18n.localize(CONFIG.ARIANRHOD.skillTimings[timing] ?? timing);

      html += `<div class="ar-sp-skill${disabled ? " disabled" : ""}" data-item-id="${skill.id}">`;
      html += `<span class="ar-sp-timing timing-${timing}" title="${timingLabel}">${timingLabel}</span>`;
      html += `<span class="ar-sp-name" title="${skill.system.effect || skill.name}">${skill.name}</span>`;
      html += `<span class="ar-sp-cost">${costStr}</span>`;
      html += `<button class="ar-sp-activate" ${disabled ? `disabled title="${reason}"` : `title="${game.i18n.localize("ARIANRHOD.SkillActivate")}"`}>`;
      html += `<i class="fas fa-dice-d20"></i>`;
      html += `</button>`;
      html += `</div>`;
    }

    if (sorted.length === 0) {
      html += `<div class="ar-sp-empty">${game.i18n.localize("ARIANRHOD.SkillPanelEmpty")}</div>`;
    }

    html += `</div>`;

    this.#el.innerHTML = html;
    this.#bindEvents(combat);
  }

  /* ---- Helpers ---- */

  #badge(label, available, titleKey) {
    const cls = available ? "available" : "used";
    const icon = available ? "fa-check" : "fa-xmark";
    return `<span class="ar-sp-badge ${cls}" title="${game.i18n.localize(titleKey)}"><i class="fas ${icon}"></i>${label}</span>`;
  }

  #isDisabled(skill, state, actor) {
    return this.#getDisabledInfo(skill, state, actor).disabled;
  }

  #getDisabledInfo(skill, state, actor) {
    const actionType = getTimingAction(skill.system.timing);
    if (actionType) {
      const check = canPerformAction(state, actionType, actor);
      if (!check.allowed) {
        return { disabled: true, reason: check.reason ? game.i18n.localize(check.reason) : "" };
      }
    }
    const cost = parseSkillCost(skill.system.cost, skill.system.level ?? 1);
    if (cost.mp > 0 && (actor.system.combat?.mp?.value ?? 0) < cost.mp) {
      return { disabled: true, reason: game.i18n.localize("ARIANRHOD.InsufficientMP") };
    }
    if (cost.hp > 0 && (actor.system.combat?.hp?.value ?? 0) < cost.hp) {
      return { disabled: true, reason: game.i18n.localize("ARIANRHOD.InsufficientHP") };
    }
    return { disabled: false, reason: "" };
  }

  /* ---- Events ---- */

  #bindEvents(combat) {
    if (!this.#el) return;

    // Close button
    this.#el.querySelector(".ar-sp-close")?.addEventListener("click", () => this.hide());

    // Filter buttons
    this.#el.querySelectorAll(".ar-sp-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.#activeFilter = btn.dataset.filter;
        this.refresh(combat);
      });
    });

    // Skill row click → activate
    this.#el.querySelectorAll(".ar-sp-skill:not(.disabled)").forEach(row => {
      row.addEventListener("click", async (e) => {
        // Don't double-fire if clicking the button specifically
        if (e.target.closest(".ar-sp-activate")) return;
        await this.#activateFromRow(row, combat);
      });
    });

    // Activate button click
    this.#el.querySelectorAll(".ar-sp-activate:not([disabled])").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row = btn.closest(".ar-sp-skill");
        await this.#activateFromRow(row, combat);
      });
    });
  }

  async #activateFromRow(row, combat) {
    const itemId = row?.dataset.itemId;
    if (!itemId) return;
    const actor = combat.combatant?.actor;
    if (!actor) return;
    const item = actor.items.get(itemId);
    if (!item) return;

    await activateSkill(actor, item);
    // Refresh after activation (actor update hook may also trigger this)
    this.refresh(combat);
  }
}

/* ---- Public API ---- */

export function registerSkillPanel() {
  _instance = new CombatSkillPanel();
  return _instance;
}

export function getSkillPanel() {
  return _instance;
}
