/**
 * FVTT Screenshot Utility for UI Development
 * Usage: node tools/screenshot.mjs <command> [options]
 *
 * Commands:
 *   world                  Screenshot the world overview
 *   actors                 Screenshot the actor directory sidebar
 *   open <actorName>       Open a specific actor sheet and screenshot
 *   create-test            Create test actors (character, enemy, guild) and screenshot each
 *   tab <actorName> <tab>  Open actor, switch to tab, and screenshot
 *   dialog <type>          Open a dialog (skill-select, equip-select, enemy-create)
 *   custom <js-eval>       Run custom JS in the FVTT context
 *
 * Options:
 *   --width=<px>        Viewport width (default: 1280)
 *   --height=<px>       Viewport height (default: 900)
 *   --out=<filename>    Output filename
 *   --full              Full page screenshot
 *   --delay=<ms>        Extra delay before screenshot (default: 0)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const FVTT_URL = 'http://10.5.0.2:30000';

// Ensure screenshots dir exists
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Parse args
const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('--')) || 'world';
const restArgs = args.filter(a => !a.startsWith('--')).slice(1);
const getOpt = (name, def) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : def;
};
const hasFlag = (name) => args.includes(`--${name}`);

const width = parseInt(getOpt('width', '1280'));
const height = parseInt(getOpt('height', '900'));
const outFile = getOpt('out', `screenshot-${command}.png`);
const fullPage = hasFlag('full');
const extraDelay = parseInt(getOpt('delay', '0'));

async function loginToFVTT(page) {
  console.log(`Navigating to ${FVTT_URL}...`);
  await page.goto(FVTT_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Handle auth page
  const currentUrl = page.url();
  if (currentUrl.includes('/setup') || currentUrl.includes('/auth')) {
    console.log('On setup/auth page - trying to proceed...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(2000);
  }

  // Handle join page
  const joinUrl = page.url();
  if (joinUrl.includes('/join')) {
    console.log('On join page, logging in as claude...');
    await page.evaluate(() => {
      const select = document.querySelector('select[name="userid"]');
      if (select) {
        for (const opt of select.options) {
          if (opt.text.toLowerCase().includes('claude')) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change'));
            break;
          }
        }
      }
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const btn = document.querySelector('button[name="join"]');
      if (btn) btn.click();
    });
    await page.waitForSelector('#ui-left', { timeout: 30000 });
    console.log('Logged into world successfully');
    await page.waitForTimeout(3000);
  }

  // Close all dialogs (welcome tour, etc.)
  await page.evaluate(() => {
    document.querySelectorAll('.app.window-app .header-button.close').forEach(b => b.click());
    document.querySelectorAll('.notification').forEach(n => n.remove());
  });
  await page.waitForTimeout(500);
}

async function listActors(page) {
  return await page.evaluate(() => {
    if (typeof game === 'undefined') return [];
    return game.actors.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      img: a.img
    }));
  });
}

async function openActorSheet(page, nameOrId) {
  const result = await page.evaluate(async (nameOrId) => {
    const actor = game.actors.find(a =>
      a.id === nameOrId ||
      a.name.toLowerCase().includes(nameOrId.toLowerCase())
    );
    if (!actor) return null;
    await actor.sheet.render(true);
    return { id: actor.id, name: actor.name, type: actor.type };
  }, nameOrId);
  if (result) {
    console.log(`Opened sheet for: ${result.name} (${result.type})`);
    await page.waitForTimeout(2000);
  }
  return result;
}

async function createTestActors(page) {
  const results = await page.evaluate(async () => {
    const created = [];
    const existingNames = game.actors.map(a => a.name);

    try {
      if (!existingNames.includes('테스트 캐릭터')) {
        const char = await Actor.create({
          name: '테스트 캐릭터',
          type: 'character',
          system: {
            race: 'human',
            mainClass: 'warrior',
            supportClass: 'acolyte',
            level: 3,
          }
        });
        if (char) created.push({ id: char.id, name: char.name, type: 'character' });
      }

      if (!existingNames.includes('테스트 에너미')) {
        const enemy = await Actor.create({
          name: '테스트 에너미',
          type: 'enemy',
          system: {
            enemyType: 'beast',
            level: 5,
          },
          flags: { arianrhod2e: { fromLibrary: true } }
        });
        if (enemy) created.push({ id: enemy.id, name: enemy.name, type: 'enemy' });
      }

      if (!existingNames.includes('테스트 길드')) {
        const guild = await Actor.create({
          name: '테스트 길드',
          type: 'guild',
          system: {
            guildLevel: 2,
            gold: 5000,
            master: '테스트 캐릭터'
          }
        });
        if (guild) created.push({ id: guild.id, name: guild.name, type: 'guild' });
      }
    } catch (e) {
      return { error: e.message, stack: e.stack, created };
    }

    return created;
  });

  if (results.error) {
    console.error(`Error creating actors: ${results.error}`);
    console.error(results.stack);
  } else {
    console.log(`Created ${results.length} test actors:`, results.map(r => `${r.name}(${r.type})`).join(', '));
  }
  return results;
}

async function switchTab(page, tabName) {
  await page.evaluate((tabName) => {
    const tab = document.querySelector(`.sheet-tabs [data-tab="${tabName}"], .tabs [data-tab="${tabName}"]`);
    if (tab) tab.click();
  }, tabName);
  await page.waitForTimeout(1000);
}

async function takeScreenshot(page, filename) {
  if (extraDelay > 0) await page.waitForTimeout(extraDelay);
  const outPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: outPath, fullPage, type: 'png' });
  console.log(`Screenshot saved: ${outPath}`);
  return outPath;
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width, height },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  try {
    await loginToFVTT(page);

    switch (command) {
      case 'world': {
        await takeScreenshot(page, outFile);
        break;
      }

      case 'actors': {
        const actors = await listActors(page);
        console.log('Actors in world:', JSON.stringify(actors, null, 2));
        // Open actors sidebar
        await page.evaluate(() => {
          document.querySelector('[data-tab="actors"]')?.click();
        });
        await page.waitForTimeout(1000);
        await takeScreenshot(page, outFile);
        break;
      }

      case 'open': {
        const name = restArgs[0];
        if (!name) { console.error('Usage: open <actorName>'); break; }
        const actor = await openActorSheet(page, name);
        if (!actor) console.error(`Actor "${name}" not found`);
        await takeScreenshot(page, outFile);
        break;
      }

      case 'create-test': {
        await createTestActors(page);
        await page.waitForTimeout(1000);

        // Open each test actor and screenshot
        const actors = await listActors(page);
        for (const actor of actors) {
          await openActorSheet(page, actor.id);
          await takeScreenshot(page, `sheet-${actor.type}-${actor.name}.png`);
          // Close the sheet
          await page.evaluate(() => {
            document.querySelectorAll('.app.window-app .header-button.close').forEach(b => b.click());
          });
          await page.waitForTimeout(500);
        }
        break;
      }

      case 'tab': {
        const name = restArgs[0];
        const tab = restArgs[1];
        if (!name || !tab) { console.error('Usage: tab <actorName> <tabName>'); break; }
        await openActorSheet(page, name);
        await switchTab(page, tab);
        await takeScreenshot(page, outFile);
        break;
      }

      case 'dialog': {
        const type = restArgs[0];
        if (!type) { console.error('Usage: dialog <type>'); break; }
        // Open dialog via FVTT API
        await page.evaluate(async (type) => {
          const mod = await import('/systems/arianrhod2e/module/arianrhod2e.mjs');
          if (type === 'enemy-create') {
            const { EnemyCreationDialog } = await import('/systems/arianrhod2e/module/apps/enemy-creation-dialog.mjs');
            new EnemyCreationDialog().render(true);
          } else if (type === 'skill-select') {
            const actor = game.actors.find(a => a.type === 'character');
            if (actor) {
              const { SkillSelectionDialog } = await import('/systems/arianrhod2e/module/apps/skill-selection-dialog.mjs');
              new SkillSelectionDialog(actor).render(true);
            }
          } else if (type === 'equip-select') {
            const actor = game.actors.find(a => a.type === 'character');
            if (actor) {
              const { EquipmentSelectionDialog } = await import('/systems/arianrhod2e/module/apps/equipment-selection-dialog.mjs');
              new EquipmentSelectionDialog(actor, 'rightHand').render(true);
            }
          }
        }, type);
        await page.waitForTimeout(2000);
        await takeScreenshot(page, outFile);
        break;
      }

      case 'eval': {
        const code = restArgs.join(' ');
        if (!code) { console.error('Usage: eval <js-code>'); break; }
        const result = await page.evaluate(code);
        console.log('Eval result:', result);
        await takeScreenshot(page, outFile);
        break;
      }

      case 'all-tabs': {
        const name = restArgs[0] || '테스트 캐릭터';
        const tabs = ['abilities', 'items', 'skills', 'connections', 'biography'];
        await openActorSheet(page, name);
        for (const tab of tabs) {
          await switchTab(page, tab);
          await takeScreenshot(page, `tab-${tab}.png`);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
    const outPath = path.join(SCREENSHOTS_DIR, `error-${outFile}`);
    try {
      await page.screenshot({ path: outPath, type: 'png' });
      console.log(`Error screenshot saved: ${outPath}`);
    } catch (e) {
      console.error('Could not take error screenshot:', e.message);
    }
  } finally {
    await browser.close();
  }
}

main();
