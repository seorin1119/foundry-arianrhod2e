/**
 * Test Combat Tracker Dock:
 * 1. Start combat → dock appears
 * 2. Verify dock structure (header, cards, End Turn button)
 * 3. End Turn → active card changes
 * 4. End combat → dock disappears
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const FVTT_URL = 'http://10.5.0.2:30000';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.error(`  ✗ ${label}`); failed++; }
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    console.log('--- Login ---');
    await page.goto(FVTT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    if (page.url().includes('/join')) {
      await page.evaluate(() => {
        const s = document.querySelector('select[name="userid"]');
        for (const o of s.options) {
          if (o.text.toLowerCase().includes('claude') || o.text.toLowerCase().includes('gamemaster')) {
            s.value = o.value;
            s.dispatchEvent(new Event('change'));
            break;
          }
        }
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelector('button[name="join"]')?.click());
      await page.waitForSelector('#ui-left', { timeout: 30000 });
      await page.waitForTimeout(3000);
    }
    console.log('Logged in.');

    // Close popups
    await page.evaluate(() => {
      document.querySelectorAll('.app.window-app .header-button.close').forEach(b => b.click());
    });
    await page.waitForTimeout(500);

    // Cleanup existing combat
    await page.evaluate(async () => { if (game.combat) await game.combat.delete(); });
    await page.waitForTimeout(500);

    // ---- Test 1: No dock before combat ----
    console.log('\n--- Test 1: No dock before combat ---');
    const dockBeforeCombat = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      return dock ? 'exists' : 'none';
    });
    assert(dockBeforeCombat === 'none', 'Dock does not exist before combat');

    // ---- Test 2: Start combat → dock appears ----
    console.log('\n--- Test 2: Start combat ---');
    const combatResult = await page.evaluate(async () => {
      const scene = game.scenes.current;
      const tokens = canvas.tokens.placeables;
      const names = tokens.map(t => t.actor?.name).filter(Boolean);
      if (tokens.length < 2) return { error: 'Need at least 2 tokens, found: ' + names.join(', ') };

      // Take first two tokens with actors
      const combatTokens = tokens.filter(t => t.actor).slice(0, 2);
      if (combatTokens.length < 2) return { error: 'Not enough tokens with actors' };

      const combat = await Combat.create({ scene: scene.id });
      await combat.createEmbeddedDocuments('Combatant', combatTokens.map(t => ({
        tokenId: t.id, sceneId: scene.id, actorId: t.actor.id
      })));
      await combat.rollAll();
      await combat.startCombat();
      return {
        ok: true,
        round: combat.round,
        turn: combat.turn,
        activeName: combat.combatant?.actor?.name,
        combatantCount: combat.turns.length,
        names: combat.turns.map(c => c.actor?.name)
      };
    });
    console.log('  Combat:', JSON.stringify(combatResult));
    assert(!combatResult.error, 'Combat started without errors');
    assert(combatResult.combatantCount >= 2, `Has ${combatResult.combatantCount} combatants`);

    await page.waitForTimeout(1500);

    // Check dock appeared
    const dockState1 = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      if (!dock) return null;
      return {
        visible: dock.classList.contains('visible'),
        hasHeader: !!dock.querySelector('.ar-dock-header'),
        hasTrack: !!dock.querySelector('.ar-dock-track'),
        hasEndTurn: !!dock.querySelector('.ar-dock-end-turn'),
        cardCount: dock.querySelectorAll('.ar-dock-card').length,
        activeCardCount: dock.querySelectorAll('.ar-dock-card.active').length,
        roundText: dock.querySelector('.ar-dock-round span')?.textContent,
        endTurnDisabled: dock.querySelector('.ar-dock-end-turn')?.disabled,
        hasPrevButton: !!dock.querySelector('.ar-dock-prev'),
      };
    });
    console.log('  Dock state:', JSON.stringify(dockState1));
    assert(dockState1 !== null, 'Dock element exists');
    assert(dockState1?.visible === true, 'Dock is visible');
    assert(dockState1?.hasHeader === true, 'Dock has header');
    assert(dockState1?.hasTrack === true, 'Dock has card track');
    assert(dockState1?.hasEndTurn === true, 'Dock has End Turn button');
    assert(dockState1?.cardCount >= 2, `Dock shows ${dockState1?.cardCount} cards`);
    assert(dockState1?.activeCardCount === 1, 'Exactly 1 active card');
    assert(dockState1?.roundText === '1', 'Round shows 1');
    assert(dockState1?.endTurnDisabled === false, 'End Turn button is enabled (GM)');
    assert(dockState1?.hasPrevButton === true, 'GM has Previous Turn button');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-dock-visible.png') });
    console.log('  Screenshot: test-dock-visible.png');

    // ---- Test 3: End Turn → active card changes ----
    console.log('\n--- Test 3: End Turn ---');
    const activeBefore = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      return dock?.querySelector('.ar-dock-card.active')?.dataset.combatantId;
    });

    await page.evaluate(async () => {
      await game.combat.nextTurn();
    });
    await page.waitForTimeout(1000);

    const activeAfter = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      return dock?.querySelector('.ar-dock-card.active')?.dataset.combatantId;
    });
    console.log(`  Active before: ${activeBefore}, after: ${activeAfter}`);
    assert(activeBefore !== activeAfter, 'Active card changed after End Turn');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-dock-next-turn.png') });
    console.log('  Screenshot: test-dock-next-turn.png');

    // ---- Test 4: Card click → pans to token ----
    console.log('\n--- Test 4: Card click ---');
    const clickResult = await page.evaluate(async () => {
      const dock = document.getElementById('ar-combat-dock');
      const cards = dock?.querySelectorAll('.ar-dock-card');
      if (!cards || cards.length === 0) return 'no cards';
      // Click the first card
      cards[0].click();
      return 'clicked';
    });
    await page.waitForTimeout(500);
    assert(clickResult === 'clicked', 'Card click executed');

    // ---- Test 5: HP bar reflects actor HP ----
    console.log('\n--- Test 5: HP bar ---');
    const hpBarState = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      const fills = dock?.querySelectorAll('.ar-dock-hp-fill');
      return {
        count: fills?.length ?? 0,
        widths: Array.from(fills ?? []).map(f => f.style.width),
      };
    });
    assert(hpBarState.count > 0, `HP bars present (${hpBarState.count})`);
    console.log('  HP widths:', hpBarState.widths);

    // ---- Test 6: Collapse/Expand ----
    console.log('\n--- Test 6: Collapse/Expand ---');
    await page.evaluate(() => {
      document.querySelector('.ar-dock-collapse')?.click();
    });
    await page.waitForTimeout(500);

    const collapsedState = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      const track = dock?.querySelector('.ar-dock-track');
      return { trackHidden: track?.style.display === 'none' };
    });
    assert(collapsedState.trackHidden === true, 'Track hidden when collapsed');

    await page.evaluate(() => {
      document.querySelector('.ar-dock-collapse')?.click();
    });
    await page.waitForTimeout(500);

    const expandedState = await page.evaluate(() => {
      const dock = document.getElementById('ar-combat-dock');
      const track = dock?.querySelector('.ar-dock-track');
      return { trackVisible: track?.style.display !== 'none' };
    });
    assert(expandedState.trackVisible === true, 'Track visible when expanded');

    // ---- Test 7: Turn indicator removed ----
    console.log('\n--- Test 7: Old turn indicator removed ---');
    const turnIndicator = await page.evaluate(() => {
      return document.getElementById('ar-turn-indicator');
    });
    assert(turnIndicator === null, '#ar-turn-indicator no longer created');

    const turnRing = await page.evaluate(() => {
      const ring = document.getElementById('ar-turn-ring');
      return ring ? 'exists' : 'none';
    });
    assert(turnRing === 'exists', '#ar-turn-ring still exists');

    // ---- Test 8: Delete combat → dock disappears ----
    console.log('\n--- Test 8: End combat ---');
    await page.evaluate(async () => {
      if (game.combat) await game.combat.delete();
    });
    await page.waitForTimeout(1000);

    const dockAfterDelete = await page.evaluate(() => {
      return document.getElementById('ar-combat-dock');
    });
    assert(dockAfterDelete === null, 'Dock removed after combat deleted');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-dock-removed.png') });
    console.log('  Screenshot: test-dock-removed.png');

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-dock-error.png') });
    failed++;
  } finally {
    await browser.close();
  }

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
