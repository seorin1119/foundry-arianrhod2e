/**
 * Test: enemy (goblin) attacks player character
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
    await page.goto(FVTT_URL, { waitUntil: 'networkidle', timeout: 30000 });
    if (page.url().includes('/join')) {
      await page.evaluate(() => {
        const s = document.querySelector('select[name="userid"]');
        for (const o of s.options) {
          if (o.text.toLowerCase().includes('claude')) {
            s.value = o.value; s.dispatchEvent(new Event('change')); break;
          }
        }
      });
      await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelector('button[name="join"]')?.click());
      await page.waitForSelector('#ui-left', { timeout: 30000 });
      await page.waitForTimeout(3000);
    }
    await page.evaluate(() => {
      document.querySelectorAll('.app.window-app .header-button.close').forEach(b => b.click());
    });
    await page.waitForTimeout(500);

    // Delete existing combat
    await page.evaluate(async () => { if (game.combat) await game.combat.delete(); });
    await page.waitForTimeout(500);

    // Start combat, ensure goblin goes first
    const setup = await page.evaluate(async () => {
      const scene = game.scenes.current;
      const tokens = canvas.tokens.placeables;
      const pt = tokens.find(t => t.actor?.name === '플레이어');
      const gt = tokens.find(t => t.actor?.name === '고블린');
      if (!pt || !gt) return 'Missing tokens';

      const combat = await Combat.create({ scene: scene.id });
      await combat.createEmbeddedDocuments('Combatant', [
        { tokenId: pt.id, sceneId: scene.id, actorId: pt.actor.id },
        { tokenId: gt.id, sceneId: scene.id, actorId: gt.actor.id }
      ]);
      // Set initiative manually: goblin higher
      const goblinC = combat.combatants.find(c => c.actor?.name === '고블린');
      const playerC = combat.combatants.find(c => c.actor?.name === '플레이어');
      if (goblinC) await goblinC.update({ initiative: 20 });
      if (playerC) await playerC.update({ initiative: 5 });
      await combat.startCombat();
      return 'Combat started. Active: ' + combat.combatant?.actor?.name;
    });
    console.log(setup);
    await page.waitForTimeout(2000);

    // Engage goblin and player, set up auto-click for dialogs, then try goblin rollAttack
    const attackResult = await page.evaluate(async () => {
      const goblin = game.actors.find(a => a.name === '고블린');
      if (!goblin) return 'Goblin actor not found';

      // Target the player token
      const playerToken = canvas.tokens.placeables.find(t => t.actor?.name === '플레이어');
      if (playerToken) playerToken.setTarget(true, { releaseOthers: true });

      // Create engagement
      const combat = game.combat;
      if (combat?.started) {
        const { createEngagement } = await import('/systems/arianrhod2e/module/helpers/engagement.mjs');
        const goblinC = combat.combatants.find(c => c.actor?.name === '고블린');
        const playerC = combat.combatants.find(c => c.actor?.name === '플레이어');
        if (goblinC && playerC) {
          await createEngagement(combat, goblinC.id, playerC.id);
        }
      }

      const stats = {
        accuracy: goblin.system.combat?.accuracy,
        attack: goblin.system.combat?.attack,
        element: goblin.system.element,
        attackPattern: goblin.system.attackPattern,
        items: goblin.items.map(i => ({ name: i.name, type: i.type })),
      };

      // Set up MutationObserver to auto-click dialog OK button when it appears
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            const okBtn = node.querySelector?.('button[data-action="ok"]');
            if (okBtn) {
              setTimeout(() => okBtn.click(), 100);
              observer.disconnect();
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      try {
        const result = await goblin.rollAttack();
        observer.disconnect();
        if (result) {
          return 'Attack SUCCESS! Roll: ' + result.roll.total + ', Weapon: ' + result.weapon.name + ' | Stats: ' + JSON.stringify(stats);
        } else {
          return 'Attack returned null. Stats: ' + JSON.stringify(stats);
        }
      } catch(e) {
        observer.disconnect();
        return 'Attack ERROR: ' + e.message + ' | Stats: ' + JSON.stringify(stats);
      }
    });
    console.log(attackResult);
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'test-enemy-attack.png') });
    console.log('Saved: test-enemy-attack.png');

    // Cleanup
    await page.evaluate(async () => { if (game.combat) await game.combat.delete(); });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
