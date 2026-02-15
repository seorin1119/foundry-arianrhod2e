/**
 * Arianrhod 2E Token HUD Enhancements.
 * Adds HP/MP quick adjustment, action tracker, movement buttons, and engagement status.
 */
import { getActionState, getActionSummary } from "./action-economy.mjs";
import { getMovementOptions, executeMovement } from "./movement.mjs";
import { isEngaged, getEngagedWith } from "./engagement.mjs";

/**
 * Register the Token HUD render hook.
 */
export function registerTokenHUD() {
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);
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

  _injectResourcePanel(html, actor);
}

/**
 * Build and inject the HP/MP quick-adjust panel with action tracker.
 * @param {HTMLElement} html - The Token HUD element
 * @param {Actor} actor - The token's actor
 */
function _injectResourcePanel(html, actor) {
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

  // Quick combat action buttons (character/enemy)
  inner += `
    <div class="ar-hud-actions">
      <button type="button" class="ar-hud-action" data-action="roll-attack" title="${game.i18n.localize("ARIANRHOD.AttackRoll")}">
        <i class="fas fa-crosshairs"></i>
      </button>
      <button type="button" class="ar-hud-action" data-action="roll-evasion" title="${game.i18n.localize("ARIANRHOD.EvasionRoll")}">
        <i class="fas fa-shield-halved"></i>
      </button>
    </div>`;

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

  // Attack roll button
  panel.querySelector("[data-action='roll-attack']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await actor.rollAttack();
  });

  // Evasion roll button
  panel.querySelector("[data-action='roll-evasion']")?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await actor.rollEvasion();
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
