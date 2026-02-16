/**
 * Arianrhod 2E Token HUD Enhancements.
 * Adds HP/MP quick adjustment, action tracker, movement buttons, and engagement status.
 */
import { getActionState, getActionSummary } from "./action-economy.mjs";
import { getMovementOptions, executeMovement } from "./movement.mjs";
import { isEngaged, getEngagedWith, createEngagement } from "./engagement.mjs";
import { isIdentified, rollEnemyIdentify } from "./enemy-identify.mjs";

/**
 * Register the Token HUD render hook and combat turn indicator.
 */
export function registerTokenHUD() {
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);

  // Highlight the active combatant's token with a visual indicator
  // updateCombat fires on turn/round/started changes
  Hooks.on("updateCombat", (combat) => {
    if (combat?.started) _updateTurnIndicator(combat);
    else _clearAllTurnIndicators();
  });
  Hooks.on("combatStart", (combat) => _updateTurnIndicator(combat));
  Hooks.on("deleteCombat", () => _clearAllTurnIndicators());
  Hooks.on("combatRound", (combat) => _updateTurnIndicator(combat));
  Hooks.on("combatTurn", (combat) => _updateTurnIndicator(combat));
}

/**
 * Update the turn indicator overlay on the active combatant's token.
 * @param {Combat} combat - The combat encounter
 */
function _updateTurnIndicator(combat) {
  _clearAllTurnIndicators();
  if (!combat?.started) return;

  const combatant = combat.combatant;
  if (!combatant) return;

  const token = canvas.tokens?.get(combatant.tokenId);
  if (!token?.mesh) return;

  // Add a pulsing ring around the token via CSS class on the token's DOM element
  // Foundry v13 tokens are rendered via PIXI, so we use a fixed-position screen overlay instead
  _positionTokenRing(token);
}

/**
 * Position a ring highlight around the given token on the canvas.
 * @param {Token} token
 */
function _positionTokenRing(token) {
  let ring = document.getElementById("ar-turn-ring");
  if (!ring) {
    ring = document.createElement("div");
    ring.id = "ar-turn-ring";
    document.getElementById("board")?.appendChild(ring);
  }

  // Convert token world coordinates to screen coordinates
  const updateRingPosition = () => {
    if (!token?.mesh || !canvas?.stage) {
      ring.style.display = "none";
      return;
    }
    const worldPos = token.mesh.getGlobalPosition();
    const { x, y } = worldPos;
    // Token dimensions in screen space
    const scale = canvas.stage.scale.x;
    const w = token.document.width * canvas.grid.size * scale;
    const h = token.document.height * canvas.grid.size * scale;

    ring.style.display = "block";
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    ring.style.width = `${w}px`;
    ring.style.height = `${h}px`;
  };

  updateRingPosition();

  // Update position when canvas pans/zooms
  if (ring._panHook) Hooks.off("canvasPan", ring._panHook);
  ring._panHook = Hooks.on("canvasPan", () => requestAnimationFrame(updateRingPosition));
}

/**
 * Remove all turn indicators from the canvas.
 */
function _clearAllTurnIndicators() {
  const ring = document.getElementById("ar-turn-ring");
  if (ring) {
    ring.style.display = "none";
    if (ring._panHook) {
      Hooks.off("canvasPan", ring._panHook);
      ring._panHook = null;
    }
  }
}

/**
 * Inject custom elements into the Token HUD.
 * @param {TokenHUD} hud - The TokenHUD application
 * @param {HTMLElement} html - The rendered HTML element
 */
function _onRenderTokenHUD(hud, html) {
  const token = hud.object;
  const actor = token.actor;
  if (!actor || !["character", "enemy"].includes(actor.type)) return;

  _injectResourcePanel(html, actor, token);
}

/**
 * Build and inject the HP/MP quick-adjust panel with action tracker.
 * @param {HTMLElement} html - The Token HUD element
 * @param {Actor} actor - The token's actor
 * @param {Token} token - The token placeable
 */
function _injectResourcePanel(html, actor, token) {
  const hp = actor.system.combat?.hp;
  const mp = actor.system.combat?.mp;
  if (!hp) return;

  const panel = document.createElement("div");
  panel.classList.add("ar-token-hud-panel");

  const hpPct = hp.max > 0 ? Math.round((hp.value / hp.max) * 100) : 0;

  let inner = `
    <div class="ar-hud-resource ar-hud-hp">
      <div class="ar-hud-row">
        <span class="ar-hud-label hp-label">HP</span>
        <div class="ar-hud-bar"><div class="ar-hud-bar-fill hp-fill" style="width:${hpPct}%"></div></div>
        <span class="ar-hud-val">${hp.value}/${hp.max}</span>
      </div>
      <div class="ar-hud-btns">
        <button type="button" data-res="hp" data-delta="-5">&minus;5</button>
        <button type="button" data-res="hp" data-delta="-1">&minus;1</button>
        <button type="button" data-res="hp" data-delta="1">+1</button>
        <button type="button" data-res="hp" data-delta="5">+5</button>
      </div>
    </div>`;

  if (mp) {
    const mpPct = mp.max > 0 ? Math.round((mp.value / mp.max) * 100) : 0;
    inner += `
    <div class="ar-hud-resource ar-hud-mp">
      <div class="ar-hud-row">
        <span class="ar-hud-label mp-label">MP</span>
        <div class="ar-hud-bar"><div class="ar-hud-bar-fill mp-fill" style="width:${mpPct}%"></div></div>
        <span class="ar-hud-val">${mp.value}/${mp.max}</span>
      </div>
      <div class="ar-hud-btns">
        <button type="button" data-res="mp" data-delta="-5">&minus;5</button>
        <button type="button" data-res="mp" data-delta="-1">&minus;1</button>
        <button type="button" data-res="mp" data-delta="1">+1</button>
        <button type="button" data-res="mp" data-delta="5">+5</button>
      </div>
    </div>`;
  }

  // Combat start / join button (only for GM when not in combat or not yet added)
  const inCombat = game.combat?.started;
  const isInCombat = inCombat && game.combat.combatants.some(c => c.actor?.id === actor.id);

  if (game.user.isGM && !inCombat) {
    // No active combat — show "Start Combat" button
    const targetCount = game.user.targets.size;
    const targetHint = targetCount > 0
      ? ` (${targetCount} ${game.i18n.localize("ARIANRHOD.TargetsSelected")})`
      : "";
    inner += `
    <div class="ar-hud-combat-start">
      <button type="button" class="ar-hud-combat-btn" data-action="start-combat">
        <i class="fas fa-swords"></i> ${game.i18n.localize("ARIANRHOD.QuickCombatStart")}${targetHint}
      </button>
      <div class="ar-hud-combat-hint">${game.i18n.localize("ARIANRHOD.QuickCombatHint")}</div>
    </div>`;
  } else if (game.user.isGM && inCombat && !isInCombat) {
    // Combat active but this token not added — show "Join Combat"
    inner += `
    <div class="ar-hud-combat-start">
      <button type="button" class="ar-hud-combat-btn ar-join-btn" data-action="join-combat">
        <i class="fas fa-plus-circle"></i> ${game.i18n.localize("ARIANRHOD.JoinCombat")}
      </button>
    </div>`;
  }

  // Context-aware combat action buttons
  const currentCombatant = game.combat?.combatant;
  const currentActor = currentCombatant?.actor;
  const isMyTurn = inCombat && currentActor && game.user.character?.id === currentActor.id;
  const isGMTurn = inCombat && game.user.isGM; // GM can act for any combatant
  const canAct = isMyTurn || isGMTurn;
  const isCurrentToken = inCombat && currentCombatant && game.combat.combatants.find(c => c.actor?.id === actor.id)?.id === currentCombatant.id;

  if (inCombat && isCurrentToken) {
    // This IS the active combatant's token → show "Your Turn!" + attack/evasion
    inner += `
    <div class="ar-hud-turn-banner">
      <i class="fas fa-play"></i> ${game.i18n.localize("ARIANRHOD.YourTurn")}
    </div>`;
    const targetToken = game.user.targets?.first();
    const targetName = targetToken?.actor?.name;
    if (targetName) {
      inner += `
    <div class="ar-hud-actions">
      <button type="button" class="ar-hud-action ar-attack-target-btn" data-action="roll-attack">
        <i class="fas fa-crosshairs"></i> ${game.i18n.format("ARIANRHOD.AttackTarget", { name: targetName })}
      </button>
    </div>`;
    } else {
      inner += `
    <div class="ar-hud-actions">
      <button type="button" class="ar-hud-action" data-action="roll-attack">
        <i class="fas fa-crosshairs"></i> ${game.i18n.localize("ARIANRHOD.AttackRoll")}
      </button>
    </div>
    <div class="ar-hud-combat-hint">${game.i18n.localize("ARIANRHOD.TargetHint")}</div>`;
    }
    inner += `
    <div class="ar-hud-actions ar-hud-secondary">
      <button type="button" class="ar-hud-action" data-action="roll-evasion">
        <i class="fas fa-shield-halved"></i> ${game.i18n.localize("ARIANRHOD.EvasionRoll")}
      </button>
    </div>`;
  } else if (inCombat && canAct && !isCurrentToken) {
    // Combat active, NOT the current combatant → this is a potential target or defender
    // Show "Attack this!" button for the current combatant to attack this token
    if (currentActor) {
      inner += `
    <div class="ar-hud-actions">
      <button type="button" class="ar-hud-action ar-attack-target-btn" data-action="attack-this"
              data-attacker-id="${currentActor.id}">
        <i class="fas fa-crosshairs"></i> ${game.i18n.format("ARIANRHOD.AttackThis", { name: actor.name })}
      </button>
      <button type="button" class="ar-hud-action" data-action="roll-evasion">
        <i class="fas fa-shield-halved"></i> ${game.i18n.localize("ARIANRHOD.EvasionRoll")}
      </button>
    </div>`;
    }
  } else {
    // No combat or fallback → generic buttons
    inner += `
    <div class="ar-hud-actions">
      <button type="button" class="ar-hud-action" data-action="roll-attack">
        <i class="fas fa-crosshairs"></i> ${game.i18n.localize("ARIANRHOD.AttackRoll")}
      </button>
      <button type="button" class="ar-hud-action" data-action="roll-magic-attack">
        <i class="fas fa-wand-sparkles"></i> ${game.i18n.localize("ARIANRHOD.MagicAttackRoll")}
      </button>
      <button type="button" class="ar-hud-action" data-action="roll-evasion">
        <i class="fas fa-shield-halved"></i> ${game.i18n.localize("ARIANRHOD.EvasionRoll")}
      </button>
    </div>`;
  }

  // Action Tracker (only in combat)
  const actionEconomyEnabled = game.settings?.get("arianrhod2e", "actionEconomyEnabled") ?? true;
  if (actionEconomyEnabled && game.combat?.started) {
    const combatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
    if (combatant) {
      const state = getActionState(combatant);
      const summary = getActionSummary(state);
      inner += `
    <div class="ar-action-tracker">
      <span class="ar-action-pip ${summary.majorAvailable ? 'available' : 'used'}" title="${game.i18n.localize("ARIANRHOD.ActionMajor")}">
        <i class="fas fa-sword"></i> M
      </span>
      <span class="ar-action-pip ${summary.minorAvailable ? 'available' : 'used'}" title="${game.i18n.localize("ARIANRHOD.ActionMinor")}">
        <i class="fas fa-hand"></i> m
      </span>
      <span class="ar-action-pip ${summary.moveAvailable ? 'available' : 'used'}" title="${game.i18n.localize("ARIANRHOD.ActionMove")}">
        <i class="fas fa-person-running"></i> Mv
      </span>
      <span class="ar-action-pip ${summary.reactionAvailable ? 'available' : 'used'}" title="${game.i18n.localize("ARIANRHOD.ActionReaction")}">
        <i class="fas fa-shield"></i> R
      </span>
    </div>`;

      // Movement buttons (only for current combatant)
      if (game.combat.combatant?.id === combatant.id) {
        const moveOptions = getMovementOptions(combatant);
        if (moveOptions.length > 0) {
          inner += `<div class="ar-hud-move-btns">`;
          for (const opt of moveOptions) {
            inner += `<button type="button" data-move-type="${opt.type}" ${!opt.available ? 'disabled' : ''} title="${opt.distance}">
              ${opt.label}
            </button>`;
          }
          inner += `</div>`;
        }
      }

      // Engagement badge
      const engagementEnabled = game.settings?.get("arianrhod2e", "engagementEnabled") ?? true;
      if (engagementEnabled) {
        const engaged = isEngaged(game.combat, combatant.id);
        if (engaged) {
          const engagedWith = getEngagedWith(game.combat, combatant.id);
          const names = engagedWith.map(id => {
            const c = game.combat.combatants.get(id);
            return c?.actor?.name ?? "?";
          }).join(", ");
          inner += `<div class="ar-engage-badge engaged" title="${names}">
            <i class="fas fa-link"></i> ${game.i18n.localize("ARIANRHOD.Engaged")} (${engagedWith.length})
          </div>`;
        } else {
          inner += `<div class="ar-engage-badge free">
            <i class="fas fa-link-slash"></i> ${game.i18n.localize("ARIANRHOD.NotEngaged")}
          </div>`;
        }
      }
    }
  }

  // Identify button for enemy tokens (visible to players)
  if (actor.type === "enemy") {
    const identified = isIdentified(actor);
    if (identified) {
      inner += `<div class="ar-hud-identify identified">
        <i class="fas fa-eye"></i> ${game.i18n.localize("ARIANRHOD.Identified")}
      </div>`;
    } else {
      inner += `<div class="ar-hud-actions">
        <button type="button" class="ar-hud-action ar-identify-btn" data-action="identify-enemy">
          <i class="fas fa-magnifying-glass"></i> ${game.i18n.localize("ARIANRHOD.IdentifyEnemy")}
        </button>
      </div>`;
    }
  }

  // Discover hidden button for hidden enemy tokens
  if (actor.hasStatusEffect?.("hidden") && actor.type !== game.user.character?.type) {
    inner += `<div class="ar-hud-actions">
      <button type="button" class="ar-hud-action ar-discover-btn" data-action="discover-hidden">
        <i class="fas fa-eye"></i> ${game.i18n.localize("ARIANRHOD.DiscoverHidden")}
      </button>
    </div>`;
  }

  panel.innerHTML = inner;

  // --- Event Listeners ---

  // +/- adjustment buttons
  panel.querySelectorAll(".ar-hud-btns button").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const res = btn.dataset.res; // "hp" or "mp"
      const delta = parseInt(btn.dataset.delta);
      const current = actor.system.combat[res];
      const newVal = Math.max(0, Math.min(current.max, current.value + delta));
      await actor.update({ [`system.combat.${res}.value`]: newVal });
      _refreshDisplay(panel, res, newVal, current.max);
    });
  });

  // Attack roll button — auto-engage with target if applicable
  panel.querySelector("[data-action='roll-attack']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Auto-engage attacker and target if engagement system is enabled
    const engagementEnabled = game.settings?.get("arianrhod2e", "engagementEnabled") ?? true;
    if (engagementEnabled && game.combat?.started) {
      const targetToken = game.user.targets?.first();
      if (targetToken?.actor) {
        const attackerCombatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
        const targetCombatant = game.combat.combatants.find(c => c.actor?.id === targetToken.actor.id);
        if (attackerCombatant && targetCombatant) {
          await createEngagement(game.combat, attackerCombatant.id, targetCombatant.id);
        }
      }
    }

    await actor.rollAttack();
  });

  // Magic attack roll button
  panel.querySelector("[data-action='roll-magic-attack']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await actor.rollMagicAttack();
  });

  // Evasion roll button
  panel.querySelector("[data-action='roll-evasion']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await actor.rollEvasion();
  });

  // "Attack this!" button — auto-engage, auto-target this token, then roll attack from the current combatant
  panel.querySelector("[data-action='attack-this']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const attackerId = e.currentTarget.dataset.attackerId;
    const attacker = game.actors.get(attackerId);
    if (!attacker) return;

    // Auto-target this token
    token.setTarget(true, { releaseOthers: true });

    // Auto-engage attacker and target if engagement system is enabled
    const engagementEnabled = game.settings?.get("arianrhod2e", "engagementEnabled") ?? true;
    if (engagementEnabled && game.combat?.started) {
      const attackerCombatant = game.combat.combatants.find(c => c.actor?.id === attackerId);
      const targetCombatant = game.combat.combatants.find(c => c.actor?.id === actor.id);
      if (attackerCombatant && targetCombatant) {
        await createEngagement(game.combat, attackerCombatant.id, targetCombatant.id);
      }
    }

    // Roll attack from the active combatant's actor
    await attacker.rollAttack();
  });

  // Quick Combat Start button (GM only)
  panel.querySelector("[data-action='start-combat']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await _startQuickCombat(token);
  });

  // Join Combat button (GM only)
  panel.querySelector("[data-action='join-combat']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await _joinCombat(token);
  });

  // Identify enemy button
  panel.querySelector("[data-action='identify-enemy']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Use selected token's actor (the one trying to identify) or first owned character
    const speaker = ChatMessage.getSpeaker();
    const identifyingActor = game.actors.get(speaker.actor) ?? game.user.character;
    if (!identifyingActor || identifyingActor.type !== "character") {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoActorSelected"));
      return;
    }
    await rollEnemyIdentify(identifyingActor, actor);
  });

  // Discover hidden button
  panel.querySelector("[data-action='discover-hidden']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const speaker = ChatMessage.getSpeaker();
    const discoverer = game.actors.get(speaker.actor) ?? game.user.character;
    if (!discoverer) {
      ui.notifications.warn(game.i18n.localize("ARIANRHOD.NoActorSelected"));
      return;
    }
    const { rollCheckDialog } = await import("../dice.mjs");
    const senBonus = discoverer.system.abilities?.sen?.bonus ?? 0;
    await rollCheckDialog({
      title: `${game.i18n.localize("ARIANRHOD.DiscoverHidden")} — ${discoverer.name}`,
      modifier: senBonus,
      label: game.i18n.localize("ARIANRHOD.DiscoverHidden"),
      actor: discoverer,
    });
  });

  // Movement buttons
  panel.querySelectorAll(".ar-hud-move-btns button").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const moveType = btn.dataset.moveType;
      const combatant = game.combat?.combatants.find(c => c.actor?.id === actor.id);
      if (combatant && moveType) {
        await executeMovement(combatant, moveType);
      }
    });
  });

  // Append panel to the HUD element
  const element = html instanceof HTMLElement ? html : html[0];
  element.appendChild(panel);

  // Smart positioning: place panel to the left or right of the HUD columns
  // Foundry HUD has ~40px wide button columns on each side of the token
  const COL_WIDTH = 46; // Foundry HUD column width + gap
  requestAnimationFrame(() => {
    const hudRect = element.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const spaceRight = window.innerWidth - hudRect.right - COL_WIDTH;
    const spaceLeft = hudRect.left - COL_WIDTH;

    if (spaceRight >= panelWidth + 8) {
      // Place to the right of the right column
      panel.style.left = `calc(100% + ${COL_WIDTH}px)`;
    } else if (spaceLeft >= panelWidth + 8) {
      // Place to the left of the left column
      panel.style.right = `calc(100% + ${COL_WIDTH}px)`;
    } else {
      // Fallback: place to the right, allow clipping
      panel.style.left = `calc(100% + ${COL_WIDTH}px)`;
    }
  });
}

/**
 * Update the resource display after a value change.
 * @param {HTMLElement} panel - The custom panel element
 * @param {string} res - Resource key ("hp" or "mp")
 * @param {number} value - New value
 * @param {number} max - Maximum value
 */
function _refreshDisplay(panel, res, value, max) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const section = panel.querySelector(`.ar-hud-${res}`);
  if (!section) return;
  const val = section.querySelector(".ar-hud-val");
  if (val) val.textContent = `${value}/${max}`;
  const fill = section.querySelector(".ar-hud-bar-fill");
  if (fill) fill.style.width = `${pct}%`;
}

/**
 * Start a quick combat: create encounter, add this token + all targeted tokens, roll initiative, begin.
 * @param {Token} token - The token that initiated combat
 */
async function _startQuickCombat(token) {
  const scene = game.scenes.current;
  if (!scene) return;

  // Collect tokens: the clicked token + all user-targeted tokens + all selected tokens
  const tokenSet = new Map();
  tokenSet.set(token.id, token);
  for (const t of game.user.targets) {
    tokenSet.set(t.id, t);
  }
  for (const t of canvas.tokens.controlled) {
    if (t.actor && ["character", "enemy"].includes(t.actor.type)) {
      tokenSet.set(t.id, t);
    }
  }

  // Create a new combat encounter
  const combat = await Combat.create({ scene: scene.id });

  // Add all collected tokens as combatants
  const combatantData = [];
  for (const [id, t] of tokenSet) {
    if (t.actor) {
      combatantData.push({
        tokenId: t.id,
        sceneId: scene.id,
        actorId: t.actor.id,
      });
    }
  }
  await combat.createEmbeddedDocuments("Combatant", combatantData);

  // Roll initiative for all and begin
  await combat.rollAll();
  await combat.startCombat();

  ui.notifications.info(game.i18n.format("ARIANRHOD.QuickCombatStarted", {
    count: combatantData.length,
  }));
}

/**
 * Add a token to the active combat as a new combatant.
 * @param {Token} token - The token to add
 */
async function _joinCombat(token) {
  const combat = game.combat;
  if (!combat || !token.actor) return;

  const scene = game.scenes.current;
  await combat.createEmbeddedDocuments("Combatant", [{
    tokenId: token.id,
    sceneId: scene.id,
    actorId: token.actor.id,
  }]);

  // Roll initiative for the newly added combatant
  const combatant = combat.combatants.find(c => c.tokenId === token.id);
  if (combatant) {
    await combat.rollInitiative([combatant.id]);
  }

  ui.notifications.info(game.i18n.format("ARIANRHOD.JoinedCombat", {
    name: token.actor.name,
  }));
}
