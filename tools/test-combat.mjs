/**
 * Test combat flow: start combat, check turn indicator, test HUD on enemy
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

const FVTT_URL = 'http://10.5.0.2:30000';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    await page.goto(FVTT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    if (page.url().includes('/join')) {
      await page.evaluate(() => {
        const s = document.querySelector('select[name="userid"]');
        for (const o of s.options) {
          if (o.text.toLowerCase().includes('claude')) {
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

    // Close popups
    await page.evaluate(() => {
      document.querySelectorAll('.app.window-app .header-button.close').forEach(b => b.click());
    });
    await page.waitForTimeout(500);

    // Delete existing combat
    await page.evaluate(async () => {
      if (game.combat) await game.combat.delete();
    });
    await page.waitForTimeout(500);

    // Start combat with both tokens
    const r1 = await page.evaluate(async () => {
      const scene = game.scenes.current;
      const tokens = canvas.tokens.placeables;
      const pt = tokens.find(t => t.actor?.name === '플레이어');
      const gt = tokens.find(t => t.actor?.name === '고블린');
      if (!pt || !gt) return 'Missing tokens: pt=' + !!pt + ' gt=' + !!gt;

      const combat = await Combat.create({ scene: scene.id });
      await combat.createEmbeddedDocuments('Combatant', [
        { tokenId: pt.id, sceneId: scene.id, actorId: pt.actor.id },
        { tokenId: gt.id, sceneId: scene.id, actorId: gt.actor.id }
      ]);
      await combat.rollAll();
      await combat.startCombat();
      return 'Combat started! Turn: ' + (combat.combatant?.actor?.name ?? 'none');
    });
    console.log(r1);
    await page.waitForTimeout(2000);

    // Screenshot 1: Turn indicator on screen
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-combat-turn.png') });
    console.log('Saved: test-combat-turn.png');

    // Click the active combatant's token to see HUD with "Your Turn"
    const activeName = await page.evaluate(() => game.combat?.combatant?.actor?.name);
    console.log('Active combatant:', activeName);

    await page.evaluate(() => {
      const c = game.combat?.combatant;
      if (!c) return;
      const token = canvas.tokens.get(c.tokenId);
      if (token) {
        token.control();
        canvas.hud.token.bind(token);
      }
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-active-hud.png') });
    console.log('Saved: test-active-hud.png');

    // Close HUD first, then click the OTHER token (non-active) to see "Attack this!" button
    await page.evaluate(() => {
      canvas.hud.token.clear();
    });
    await page.waitForTimeout(500);

    // Verify combat is still active
    const combatCheck = await page.evaluate(() => {
      return 'Combat active: ' + !!game.combat?.started + ', combatant: ' + (game.combat?.combatant?.actor?.name ?? 'none');
    });
    console.log(combatCheck);

    await page.evaluate(() => {
      const c = game.combat?.combatant;
      if (!c) return;
      // Find the OTHER token (not the active combatant)
      const other = canvas.tokens.placeables.find(t => t.actor && t.id !== c.tokenId);
      if (other) {
        other.control();
        canvas.hud.token.bind(other);
      }
    });
    await page.waitForTimeout(1500);

    // Check what HUD panel contains
    const hudContent = await page.evaluate(() => {
      const panel = document.querySelector('.ar-token-hud-panel');
      if (!panel) return 'No panel found';
      return panel.innerText;
    });
    console.log('HUD panel text:', hudContent);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-target-hud.png') });
    console.log('Saved: test-target-hud.png');

    // Check if turn indicator exists
    const indicatorCheck = await page.evaluate(() => {
      const ind = document.getElementById('ar-turn-indicator');
      const ring = document.getElementById('ar-turn-ring');
      return {
        indicator: ind ? { visible: ind.classList.contains('visible'), text: ind.innerText } : null,
        ring: ring ? { display: ring.style.display } : null,
      };
    });
    console.log('Turn indicator:', JSON.stringify(indicatorCheck));

    // Cleanup
    await page.evaluate(async () => {
      if (game.combat) await game.combat.delete();
    });

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-combat-error.png') });
  } finally {
    await browser.close();
  }
}

main();
