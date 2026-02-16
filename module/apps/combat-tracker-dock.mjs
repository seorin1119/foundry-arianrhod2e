/**
 * Combat Tracker Dock - A bottom-of-screen combat turn tracker.
 * Shows all combatants in initiative order with End Turn controls.
 */

/** @type {CombatTrackerDock|null} */
let _instance = null;

class CombatTrackerDock {
  /** @type {HTMLElement|null} */
  #el = null;
  #collapsed = false;

  /* ---------------------------------------- */
  /*  Show / Hide / Refresh                   */
  /* ---------------------------------------- */

  /**
   * Show the dock for the given combat.
   * @param {Combat} combat
   */
  show(combat) {
    if (this.#el) { this.refresh(combat); return; }
    if (!combat?.started && !combat?.round) return;
    {
      this.#el = document.createElement("div");
      this.#el.id = "ar-combat-dock";
      this.#el.classList.add("visible");
      document.getElementById("interface")?.appendChild(this.#el);
      this.refresh(combat);
    }
  }

  /** Remove the dock from the DOM. */
  hide() {
    if (this.#el) {
      this.#el.remove();
      this.#el = null;
    }
  }

  /**
   * Re-render dock contents.
   * @param {Combat} combat
   */
  refresh(combat) {
    if (!this.#el || !combat?.started) { this.hide(); return; }

    const isGM = game.user.isGM;
    const currentId = combat.combatant?.id;

    // Header
    const round = combat.round ?? 1;
    const phase = this.#getPhaseLabel(combat);
    const canEnd = this.#canEndTurn(combat);

    let html = `<div class="ar-dock-header">`;
    html += `<div class="ar-dock-round">${game.i18n.localize("ARIANRHOD.DockRound")} <span>${round}</span></div>`;
    if (phase) html += `<span class="ar-dock-phase-badge">${phase}</span>`;
    html += `<div class="ar-dock-controls">`;
    if (isGM) html += `<button class="ar-dock-prev" title="${game.i18n.localize("ARIANRHOD.DockPrevTurn")}"><i class="fas fa-backward-step"></i></button>`;
    html += `<button class="ar-dock-end-turn" ${canEnd ? "" : "disabled"}><i class="fas fa-forward-step"></i> ${game.i18n.localize("ARIANRHOD.DockEndTurn")}</button>`;
    html += `<button class="ar-dock-collapse" title="${this.#collapsed ? game.i18n.localize("ARIANRHOD.DockExpand") : game.i18n.localize("ARIANRHOD.DockCollapse")}">`;
    html += this.#collapsed ? `<i class="fas fa-chevron-up"></i>` : `<i class="fas fa-chevron-down"></i>`;
    html += `</button>`;
    html += `</div></div>`;

    // Track
    html += `<div class="ar-dock-track" ${this.#collapsed ? 'style="display:none"' : ""}>`;
    const combatants = combat.turns;
    for (const c of combatants) {
      // Hidden combatants: skip for non-GM if hidden
      if (c.hidden && !isGM) continue;

      const isActive = c.id === currentId;
      const isEnemy = c.actor?.type === "enemy";
      const isDefeated = c.isDefeated;
      const hp = c.actor?.system?.combat?.hp;
      const hpPct = hp && hp.max > 0 ? Math.round((hp.value / hp.max) * 100) : 100;
      const name = isGM || !c.hidden ? (c.actor?.name ?? c.name ?? game.i18n.localize("ARIANRHOD.DockUnknown")) : game.i18n.localize("ARIANRHOD.DockUnknown");
      const img = c.actor?.img || c.img || "icons/svg/mystery-man.svg";
      const init = c.initiative ?? "—";

      let cardClass = "ar-dock-card";
      if (isActive) cardClass += " active";
      if (isEnemy) cardClass += " enemy";
      if (isDefeated) cardClass += " defeated";

      html += `<div class="${cardClass}" data-combatant-id="${c.id}">`;
      html += `<div class="ar-dock-card-portrait">`;
      html += `<img src="${img}" alt="${name}" loading="lazy"/>`;
      html += `<span class="ar-dock-init">${init}</span>`;
      html += `</div>`;
      html += `<div class="ar-dock-card-name" title="${name}">${name}</div>`;
      if (hp && (isGM || !isEnemy)) {
        html += `<div class="ar-dock-hp-bar"><div class="ar-dock-hp-fill" style="width:${Math.max(0, Math.min(100, hpPct))}%"></div></div>`;
      }
      if (isDefeated) {
        html += `<div class="ar-dock-defeated-overlay">${game.i18n.localize("ARIANRHOD.DockDefeated")}</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    this.#el.innerHTML = html;
    this.#bindEvents(combat);
    if (!this.#collapsed) this.#scrollToActive();
  }

  /* ---------------------------------------- */
  /*  Event Handlers                          */
  /* ---------------------------------------- */

  /**
   * Bind click events on the dock.
   * @param {Combat} combat
   */
  #bindEvents(combat) {
    if (!this.#el) return;

    // End Turn
    this.#el.querySelector(".ar-dock-end-turn")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#onEndTurn(combat);
    });

    // Previous Turn (GM only)
    this.#el.querySelector(".ar-dock-prev")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#onPrevTurn(combat);
    });

    // Collapse toggle
    this.#el.querySelector(".ar-dock-collapse")?.addEventListener("click", (e) => {
      e.preventDefault();
      this.#toggleCollapse(combat);
    });

    // Card click → pan to token
    this.#el.querySelectorAll(".ar-dock-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.preventDefault();
        this.#onCardClick(combat, card.dataset.combatantId);
      });
    });
  }

  /** @param {Combat} combat */
  async #onEndTurn(combat) {
    if (!this.#canEndTurn(combat)) return;
    await combat.nextTurn();
  }

  /** @param {Combat} combat */
  async #onPrevTurn(combat) {
    if (!game.user.isGM) return;
    await combat.previousTurn();
  }

  /**
   * Pan camera to the combatant's token and select it.
   * @param {Combat} combat
   * @param {string} combatantId
   */
  #onCardClick(combat, combatantId) {
    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;
    const token = canvas.tokens?.get(combatant.tokenId);
    if (!token) return;
    canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
    token.control({ releaseOthers: true });
  }

  /** @param {Combat} combat */
  #toggleCollapse(combat) {
    this.#collapsed = !this.#collapsed;
    this.refresh(combat);
  }

  /* ---------------------------------------- */
  /*  Helpers                                 */
  /* ---------------------------------------- */

  /** Scroll the track so the active card is visible. */
  #scrollToActive() {
    if (!this.#el) return;
    const track = this.#el.querySelector(".ar-dock-track");
    const activeCard = this.#el.querySelector(".ar-dock-card.active");
    if (track && activeCard) {
      activeCard.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  /**
   * Can the current user end the turn?
   * @param {Combat} combat
   * @returns {boolean}
   */
  #canEndTurn(combat) {
    if (game.user.isGM) return true;
    const currentCombatant = combat.combatant;
    if (!currentCombatant?.actor) return false;
    // Player can end turn if they own the current combatant
    return currentCombatant.actor.isOwner;
  }

  /**
   * Get a localised phase label from round context.
   * @param {Combat} combat
   * @returns {string}
   */
  #getPhaseLabel(combat) {
    // Use combat flags if available, otherwise default to "Main"
    const phase = combat.getFlag?.("arianrhod2e", "phase");
    if (phase === "setup") return game.i18n.localize("ARIANRHOD.DockPhaseSetup");
    if (phase === "initiative") return game.i18n.localize("ARIANRHOD.DockPhaseInitiative");
    if (phase === "cleanup") return game.i18n.localize("ARIANRHOD.DockPhaseCleanup");
    return game.i18n.localize("ARIANRHOD.DockPhaseMain");
  }
}

/* -------------------------------------------- */
/*  Public Registration Function                */
/* -------------------------------------------- */

/**
 * Create the singleton dock instance and register all combat-related hooks.
 */
export function registerCombatDock() {
  _instance = new CombatTrackerDock();

  Hooks.on("combatStart", (combat) => {
    _instance.show(combat);
  });

  Hooks.on("updateCombat", (combat) => {
    if (combat?.started) _instance.show(combat);
    else _instance.hide();
  });

  Hooks.on("combatTurn", (combat) => {
    _instance.refresh(combat);
  });

  Hooks.on("combatRound", (combat) => {
    _instance.refresh(combat);
  });

  Hooks.on("deleteCombat", () => {
    _instance.hide();
  });

  Hooks.on("createCombatant", (combatant) => {
    const combat = combatant.combat ?? game.combat;
    if (combat?.started) _instance.refresh(combat);
  });

  Hooks.on("deleteCombatant", (combatant) => {
    const combat = game.combat;
    if (combat?.started) _instance.refresh(combat);
  });

  Hooks.on("updateActor", (actor) => {
    const combat = game.combat;
    if (!combat?.started) return;
    // Only refresh if this actor is in the current combat
    const inCombat = combat.combatants.some((c) => c.actor?.id === actor.id);
    if (inCombat) _instance.refresh(combat);
  });

  // On ready, show dock if there's an active combat
  Hooks.on("ready", () => {
    const combat = game.combat;
    if (combat?.started) _instance.show(combat);
  });
}
