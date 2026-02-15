/**
 * Arianrhod 2E Token HUD Enhancements.
 * Adds HP/MP quick adjustment panel below the Token HUD.
 * Status effects are already handled via CONFIG.statusEffects (13 conditions).
 */

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
 * Build and inject the HP/MP quick-adjust panel.
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
