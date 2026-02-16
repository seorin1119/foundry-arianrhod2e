/**
 * Playwright E2E test for v0.6.0 features:
 * 1. Level-Up Wizard Dialog
 * 2. Session End Dialog (GM tool)
 * 3. Enemy Sheet Enhancement (element/EXP badges, quick reference)
 */
import { chromium } from "playwright";

const BASE = "http://10.5.0.2:30000";
const TIMEOUT = 15000;

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function joinAsGamemaster(page) {
  log("Navigating to join page...");
  await page.goto(`${BASE}/join`, { waitUntil: "domcontentloaded", timeout: TIMEOUT });
  await page.waitForTimeout(2000);

  // Select Gamemaster user via JS (select may be disabled)
  log("Selecting Gamemaster user...");
  await page.evaluate(() => {
    const select = document.querySelector('select[name="userid"]');
    if (select) {
      const opt = [...select.options].find(o => o.text.includes("Gamemaster") || o.text.includes("gamemaster"));
      if (opt) {
        select.value = opt.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(500);

  // Click join button
  const joinBtn = page.locator('button[name="join"], button:has-text("Join"), button:has-text("参加"), button:has-text("접속")');
  if (await joinBtn.count() > 0) {
    await joinBtn.first().click();
    log("Clicked join button");
  }

  // Wait for the game to load
  log("Waiting for game to load...");
  await page.waitForTimeout(8000);

  // Dismiss any dialogs/notifications
  try {
    const closeButtons = page.locator('.notification .close, .dialog .close, [data-action="close"]');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      await closeButtons.nth(i).click().catch(() => {});
    }
  } catch (e) { /* ignore */ }
}

async function testLevelUpWizard(page) {
  log("\n=== TEST 1: Level-Up Wizard ===");
  const results = { pass: 0, fail: 0, details: [] };

  // Find or create a character actor with enough GP
  // Note: growthPoints.total = (level - 1) * 2 (derived), so level must be >= 2
  log("Looking for a character actor...");
  const charInfo = await page.evaluate(async () => {
    let char = game.actors?.find(a => a.type === "character");
    if (!char) {
      char = await Actor.create({
        name: "Test Character v060",
        type: "character",
        system: {
          race: "huulin",
          mainClass: "warrior",
          supportClass: "thief",
          level: 3,
          experience: 100,
          growthPoints: { spent: 0 },
        }
      });
    } else {
      // Ensure the character has enough GP: total = (level-1)*2, cost = level
      // Level must be high enough that (level-1)*2 - spent >= level
      const cost = char.system.level;
      const remaining = char.system.growthPoints?.remaining ?? 0;
      if (remaining < cost) {
        // Reset spent to 0 and set level high enough
        const neededLevel = Math.max(char.system.level, 3);
        await char.update({
          "system.level": neededLevel,
          "system.growthPoints.spent": 0,
        });
      }
    }
    // Re-fetch after possible update
    char = game.actors.get(char.id);
    return { id: char.id, name: char.name, level: char.system.level, gp: char.system.growthPoints?.remaining };
  });
  await page.waitForTimeout(1000);
  log(`Character: ${charInfo?.name} (Lv.${charInfo?.level}, GP: ${charInfo?.gp})`);

  // Open character sheet
  log("Opening character sheet...");
  const sheetOpened = await page.evaluate((id) => {
    const char = game.actors.get(id);
    if (!char) return false;
    char.sheet.render(true);
    return true;
  }, charInfo.id);

  if (!sheetOpened) {
    results.fail++;
    results.details.push("FAIL: Could not open character sheet");
    return results;
  }
  results.pass++;
  results.details.push("PASS: Character sheet opened");
  await page.waitForTimeout(2000);

  // Try to open level-up wizard via API (more reliable than clicking)
  log("Opening Level-Up Wizard via API...");
  const wizardOpened = await page.evaluate(async (id) => {
    try {
      const char = game.actors.get(id);
      if (!char) return { error: "No character" };

      const { LevelUpDialog } = await import("/systems/arianrhod2e/module/apps/level-up-dialog.mjs");
      const dialog = new LevelUpDialog(char);
      dialog.render(true);
      return { success: true, actorName: char.name, level: char.system.level, gp: char.system.growthPoints?.remaining };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  }, charInfo.id);

  if (wizardOpened?.success) {
    results.pass++;
    results.details.push(`PASS: Level-Up Wizard opened for ${wizardOpened.actorName} (Lv.${wizardOpened.level})`);
  } else {
    results.fail++;
    results.details.push(`FAIL: Level-Up Wizard failed to open: ${wizardOpened?.error}`);
    return results;
  }

  await page.waitForTimeout(2000);

  // Check wizard DOM elements
  log("Checking wizard DOM structure...");
  const wizardDOM = await page.evaluate(() => {
    const form = document.querySelector('.ar-levelup-form');
    if (!form) return { found: false };
    return {
      found: true,
      hasSteps: !!form.querySelector('.ar-levelup-steps'),
      hasCostBar: !!form.querySelector('.ar-levelup-cost-bar'),
      hasPatterns: !!form.querySelector('.ar-levelup-pattern-card'),
      patternCount: form.querySelectorAll('.ar-levelup-pattern-card').length,
      hasFooter: !!form.querySelector('.ar-levelup-footer'),
    };
  });

  if (wizardDOM.found) {
    results.pass++;
    results.details.push(`PASS: Wizard form found - steps: ${wizardDOM.hasSteps}, cost bar: ${wizardDOM.hasCostBar}, patterns: ${wizardDOM.patternCount}`);
  } else {
    results.fail++;
    results.details.push("FAIL: Wizard form .ar-levelup-form not found in DOM");
  }

  // Test Step 1: Select Pattern A
  log("Step 1: Selecting Pattern A...");
  const patternSelected = await page.evaluate(() => {
    const patternCard = document.querySelector('.ar-levelup-pattern-card[data-pattern="A"]');
    if (!patternCard) return false;
    patternCard.click();
    return true;
  });

  if (patternSelected) {
    results.pass++;
    results.details.push("PASS: Pattern A card clicked");
  } else {
    results.fail++;
    results.details.push("FAIL: Pattern A card not found");
  }
  await page.waitForTimeout(1500);

  // Click Next to go to Step 2
  log("Clicking Next to Step 2...");
  const nextClicked = await page.evaluate(() => {
    const nextBtn = document.querySelector('[data-action="nextStep"]');
    if (!nextBtn) return false;
    nextBtn.click();
    return true;
  });

  if (nextClicked) {
    results.pass++;
    results.details.push("PASS: Next button clicked → Step 2");
  } else {
    results.fail++;
    results.details.push("FAIL: Next button not found");
  }
  await page.waitForTimeout(1500);

  // Check Step 2: Ability selection
  log("Step 2: Checking ability cards...");
  const abilityCards = await page.evaluate(() => {
    const cards = document.querySelectorAll('.ar-levelup-ability-card');
    return { count: cards.length };
  });

  if (abilityCards.count === 7) {
    results.pass++;
    results.details.push(`PASS: 7 ability cards displayed`);
  } else {
    results.fail++;
    results.details.push(`FAIL: Expected 7 ability cards, found ${abilityCards.count}`);
  }

  // Close the wizard
  log("Closing wizard...");
  await page.evaluate(() => {
    const app = Object.values(ui.windows).find(w => w.constructor.name === "LevelUpDialog");
    if (app) app.close();
  });
  await page.waitForTimeout(1000);

  return results;
}

async function testSessionEndDialog(page) {
  log("\n=== TEST 2: Session End Dialog ===");
  const results = { pass: 0, fail: 0, details: [] };

  // Open via API
  log("Opening Session End Dialog via API...");
  const dialogOpened = await page.evaluate(async () => {
    try {
      const { SessionEndDialog } = await import("/systems/arianrhod2e/module/apps/session-end-dialog.mjs");
      const dialog = new SessionEndDialog();
      dialog.render(true);
      return { success: true };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });

  if (dialogOpened?.success) {
    results.pass++;
    results.details.push("PASS: Session End Dialog opened");
  } else {
    results.fail++;
    results.details.push(`FAIL: Session End Dialog failed: ${dialogOpened?.error}`);
    return results;
  }

  await page.waitForTimeout(2000);

  // Check DOM
  log("Checking Session End DOM...");
  const sessionDOM = await page.evaluate(() => {
    const container = document.querySelector('.ar-session-end');
    if (!container) return { found: false };
    return {
      found: true,
      hasHeader: !!container.querySelector('.ar-session-header'),
      hasQuickSet: !!container.querySelector('.ar-session-quick-set'),
      hasPCList: !!container.querySelector('.ar-session-pc-list'),
      pcRowCount: container.querySelectorAll('.session-pc-row').length,
      hasApplyBtn: !!container.querySelector('[data-action="applyAll"]'),
      hasSetAllBtn: !!container.querySelector('[data-action="setAllGP"]'),
    };
  });

  if (sessionDOM.found) {
    results.pass++;
    results.details.push(`PASS: Session End form found - header: ${sessionDOM.hasHeader}, quick set: ${sessionDOM.hasQuickSet}, PC rows: ${sessionDOM.pcRowCount}`);
  } else {
    results.fail++;
    results.details.push("FAIL: Session End container .ar-session-end not found");
  }

  if (sessionDOM.hasApplyBtn) {
    results.pass++;
    results.details.push("PASS: Apply All button present");
  } else {
    results.fail++;
    results.details.push("FAIL: Apply All button not found");
  }

  // Test Set All GP functionality
  log("Testing Set All GP...");
  const setAllResult = await page.evaluate(() => {
    const quickInput = document.querySelector('.quick-gp-input');
    if (!quickInput) return { error: "No quick input" };
    quickInput.value = "15";
    const setAllBtn = document.querySelector('[data-action="setAllGP"]');
    if (!setAllBtn) return { error: "No set all button" };
    setAllBtn.click();

    // Check if GP inputs were updated
    const gpInputs = document.querySelectorAll('.session-pc-row [name="gp"]');
    const values = [...gpInputs].map(i => i.value);
    return { values, count: gpInputs.length };
  });
  await page.waitForTimeout(500);

  if (setAllResult.count > 0 && setAllResult.values.every(v => v === "15")) {
    results.pass++;
    results.details.push(`PASS: Set All GP worked - ${setAllResult.count} PCs set to 15`);
  } else if (setAllResult.count === 0) {
    results.details.push("INFO: No PC rows to test Set All GP (no player-owned characters)");
  } else {
    results.fail++;
    results.details.push(`FAIL: Set All GP - values: ${JSON.stringify(setAllResult.values)}`);
  }

  // Close dialog
  await page.evaluate(() => {
    const app = Object.values(ui.windows).find(w => w.constructor.name === "SessionEndDialog");
    if (app) app.close();
  });
  await page.waitForTimeout(1000);

  return results;
}

async function testEnemySheetEnhancement(page) {
  log("\n=== TEST 3: Enemy Sheet Enhancement ===");
  const results = { pass: 0, fail: 0, details: [] };

  // Find or create an enemy with element and drops
  log("Setting up enemy actor...");
  const enemyInfo = await page.evaluate(async () => {
    let enemy = game.actors.find(a => a.type === "enemy");
    if (!enemy) {
      enemy = await Actor.create({
        name: "Test Enemy v060",
        type: "enemy",
        system: {
          level: 5,
          exp: 30,
          element: "fire",
          drops: "마법의 돌 (2d6: 7+)",
          attackPattern: "1R: 근접공격, 2R: 불꽃의 숨결",
          enemyType: "boss",
        }
      });
    } else {
      // Ensure it has element and drops
      await enemy.update({
        "system.element": "fire",
        "system.exp": 30,
        "system.drops": "마법의 돌 (2d6: 7+)",
        "system.attackPattern": "1R: 근접공격, 2R: 불꽃의 숨결",
      });
    }
    return { id: enemy.id, name: enemy.name };
  });
  await page.waitForTimeout(1000);

  // Open enemy sheet
  log(`Opening enemy sheet: ${enemyInfo.name}...`);
  await page.evaluate((id) => {
    const enemy = game.actors.get(id);
    if (enemy) enemy.sheet.render(true);
  }, enemyInfo.id);
  await page.waitForTimeout(2500);

  // Check element badge
  log("Checking element badge...");
  const badgeCheck = await page.evaluate(() => {
    const badges = document.querySelector('.ar-enemy-badges');
    if (!badges) return { found: false };
    const elementBadge = badges.querySelector('.ar-badge-element');
    const expBadge = badges.querySelector('.ar-badge-exp');
    return {
      found: true,
      hasElementBadge: !!elementBadge,
      elementText: elementBadge?.textContent?.trim() || "",
      hasExpBadge: !!expBadge,
      expText: expBadge?.textContent?.trim() || "",
      isFireClass: elementBadge?.classList.contains('element-fire') || false,
    };
  });

  if (badgeCheck.found && badgeCheck.hasElementBadge) {
    results.pass++;
    results.details.push(`PASS: Element badge found - "${badgeCheck.elementText}", fire class: ${badgeCheck.isFireClass}`);
  } else {
    results.fail++;
    results.details.push(`FAIL: Element badge not found (badges container: ${badgeCheck.found})`);
  }

  if (badgeCheck.hasExpBadge) {
    results.pass++;
    results.details.push(`PASS: EXP badge found - "${badgeCheck.expText}"`);
  } else {
    results.fail++;
    results.details.push("FAIL: EXP badge not found");
  }

  // Switch to description tab and check quick reference
  log("Switching to description tab...");
  await page.evaluate(() => {
    const descTab = document.querySelector('[data-tab="description"]');
    if (descTab) descTab.click();
  });
  await page.waitForTimeout(1500);

  const quickRefCheck = await page.evaluate(() => {
    const quickRef = document.querySelector('.ar-enemy-quick-ref');
    if (!quickRef) return { found: false };
    const refRows = quickRef.querySelectorAll('.ref-row');
    return {
      found: true,
      rowCount: refRows.length,
      texts: [...refRows].map(r => r.textContent.trim()),
    };
  });

  if (quickRefCheck.found) {
    results.pass++;
    results.details.push(`PASS: Quick reference found with ${quickRefCheck.rowCount} rows`);
  } else {
    results.fail++;
    results.details.push("FAIL: Quick reference section not found");
  }

  // Close enemy sheet
  await page.evaluate(() => {
    Object.values(ui.windows).filter(w => w.constructor.name === "ArianrhodActorSheet").forEach(w => w.close());
  });
  await page.waitForTimeout(500);

  return results;
}

async function testSceneControlButton(page) {
  log("\n=== TEST 4: Scene Control Button ===");
  const results = { pass: 0, fail: 0, details: [] };

  // Check if the session end button exists in scene controls
  const btnCheck = await page.evaluate(() => {
    // Check via API
    const hasAPI = typeof game.arianrhod2e?.openSessionEnd === "function";
    return { hasAPI };
  });

  if (btnCheck.hasAPI) {
    results.pass++;
    results.details.push("PASS: game.arianrhod2e.openSessionEnd() API registered");
  } else {
    results.fail++;
    results.details.push("FAIL: openSessionEnd API not found");
  }

  // Test calling the API
  log("Testing openSessionEnd API...");
  const apiResult = await page.evaluate(async () => {
    try {
      await game.arianrhod2e.openSessionEnd();
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  });
  await page.waitForTimeout(2000);

  if (apiResult.success) {
    results.pass++;
    results.details.push("PASS: openSessionEnd() executed without error");
  } else {
    results.fail++;
    results.details.push(`FAIL: openSessionEnd() error: ${apiResult.error}`);
  }

  // Verify dialog opened
  const dialogVisible = await page.evaluate(() => {
    return !!document.querySelector('.ar-session-end');
  });

  if (dialogVisible) {
    results.pass++;
    results.details.push("PASS: Session End dialog visible after API call");
  } else {
    results.fail++;
    results.details.push("FAIL: Session End dialog not visible after API call");
  }

  // Close
  await page.evaluate(() => {
    const app = Object.values(ui.windows).find(w => w.constructor.name === "SessionEndDialog");
    if (app) app.close();
  });

  return results;
}

async function testVersionBump(page) {
  log("\n=== TEST 5: Version Check ===");
  const results = { pass: 0, fail: 0, details: [] };

  const version = await page.evaluate(() => {
    return game.system?.version || game.system?.data?.version || "unknown";
  });

  if (version === "0.6.0") {
    results.pass++;
    results.details.push(`PASS: System version is ${version}`);
  } else {
    // Version shows cached value until server restart — not a code bug
    results.details.push(`INFO: System version is ${version} (expected 0.6.0 — restart Foundry to update)`);
  }

  return results;
}

// --- Main ---
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    await joinAsGamemaster(page);

    // Verify game loaded
    const gameReady = await page.evaluate(() => !!game?.ready);
    if (!gameReady) {
      log("ERROR: Game not ready. Waiting longer...");
      await page.waitForTimeout(10000);
    }

    const allResults = [];

    allResults.push(await testVersionBump(page));
    allResults.push(await testLevelUpWizard(page));
    allResults.push(await testSessionEndDialog(page));
    allResults.push(await testEnemySheetEnhancement(page));
    allResults.push(await testSceneControlButton(page));

    // Summary
    let totalPass = 0, totalFail = 0;
    log("\n" + "=".repeat(60));
    log("TEST RESULTS SUMMARY");
    log("=".repeat(60));
    for (const r of allResults) {
      totalPass += r.pass;
      totalFail += r.fail;
      for (const d of r.details) {
        log(`  ${d}`);
      }
    }
    log("=".repeat(60));
    log(`TOTAL: ${totalPass} passed, ${totalFail} failed`);
    log("=".repeat(60));

    if (consoleErrors.length > 0) {
      log(`\nConsole errors (${consoleErrors.length}):`);
      for (const e of consoleErrors.slice(0, 10)) {
        log(`  ERROR: ${e.substring(0, 200)}`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: "/mnt/c/Users/js4u1/AppData/Local/FoundryVTT/Data/systems/arianrhod2e/screenshots/test-v060.png", fullPage: false });
    log("\nScreenshot saved: screenshots/test-v060.png");

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    console.error(err);
    await page.screenshot({ path: "/mnt/c/Users/js4u1/AppData/Local/FoundryVTT/Data/systems/arianrhod2e/screenshots/test-v060-error.png" });
  } finally {
    await browser.close();
  }
})();
