import { chromium } from 'playwright';

const SCREENSHOT_DIR = 'C:/Users/Purnendu/Desktop/kimiK2.5/screenshots';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const results = [];

  // ========== TEST 1: Main page ==========
  console.log('\n=== TEST 1: Main Page ===');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-main-page.png`, fullPage: false });
  console.log('Screenshot saved: 01-main-page.png');

  // Check sidebar for "Purn AI" and "Purn Cop" links
  const sidebarText = await page.locator('aside, nav, [class*="sidebar"], [class*="Sidebar"]').first().textContent().catch(() => '');
  const bodyText = await page.locator('body').textContent();

  const hasPurnAI = bodyText.includes('Purn AI');
  const hasPurnCop = bodyText.includes('Purn Cop');

  console.log(`Sidebar contains "Purn AI": ${hasPurnAI}`);
  console.log(`Sidebar contains "Purn Cop": ${hasPurnCop}`);
  results.push({ test: 'Main Page - Purn AI link', pass: hasPurnAI });
  results.push({ test: 'Main Page - Purn Cop link', pass: hasPurnCop });

  // ========== TEST 2: Purn Cop page ==========
  console.log('\n=== TEST 2: Purn Cop Page ===');

  // Try clicking the Purn Cop link in sidebar
  const purnCopLink = page.locator('a, button').filter({ hasText: /Purn Cop/i }).first();
  if (await purnCopLink.count() > 0) {
    await purnCopLink.click();
    console.log('Clicked "Purn Cop" link');
  } else {
    await page.goto('http://localhost:3000/purn-cop', { waitUntil: 'networkidle' });
    console.log('Navigated directly to /purn-cop');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-purn-cop-page.png`, fullPage: false });
  console.log('Screenshot saved: 02-purn-cop-page.png');

  const purnCopBody = await page.locator('body').textContent();

  // Check welcome screen elements
  const hasTitle = purnCopBody.includes('Purn Cop');
  const hasCyberSubtitle = /cybersecurity/i.test(purnCopBody);
  console.log(`Title "Purn Cop" present: ${hasTitle}`);
  console.log(`Cybersecurity subtitle present: ${hasCyberSubtitle}`);
  results.push({ test: 'Purn Cop - Title present', pass: hasTitle });
  results.push({ test: 'Purn Cop - Cybersecurity subtitle', pass: hasCyberSubtitle });

  // Check feature chips
  const chipTexts = ['Deep Research', 'Threat Intel', 'Security Report'];
  for (const chip of chipTexts) {
    const found = purnCopBody.includes(chip);
    console.log(`Feature chip "${chip}" present: ${found}`);
    results.push({ test: `Purn Cop - Chip "${chip}"`, pass: found });
  }

  // Check input placeholder
  const inputPlaceholder = await page.locator('input, textarea').first().getAttribute('placeholder').catch(() => '');
  const hasCorrectPlaceholder = /purn cop.*cybersecurity/i.test(inputPlaceholder);
  console.log(`Input placeholder: "${inputPlaceholder}"`);
  console.log(`Correct placeholder: ${hasCorrectPlaceholder}`);
  results.push({ test: 'Purn Cop - Input placeholder', pass: hasCorrectPlaceholder });

  // Check footer
  const hasFooter = /Purn Cop.*Cybersecurity Mode/i.test(purnCopBody);
  console.log(`Footer "Purn Cop - Cybersecurity Mode": ${hasFooter}`);
  results.push({ test: 'Purn Cop - Footer text', pass: hasFooter });

  // Check header badge
  const hasCyberBadge = purnCopBody.includes('Cybersecurity');
  console.log(`Header "Cybersecurity" badge: ${hasCyberBadge}`);
  results.push({ test: 'Purn Cop - Cybersecurity badge', pass: hasCyberBadge });

  // ========== TEST 3: Navigate back to Purn AI ==========
  console.log('\n=== TEST 3: Navigate Back to Purn AI ===');

  const purnAILink = page.locator('a, button').filter({ hasText: /Purn AI/i }).first();
  if (await purnAILink.count() > 0) {
    await purnAILink.click();
    console.log('Clicked "Purn AI" link');
  } else {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Navigated directly to /');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-back-to-purn-ai.png`, fullPage: false });
  console.log('Screenshot saved: 03-back-to-purn-ai.png');

  const backBody = await page.locator('body').textContent();
  const backHasPurnAI = backBody.includes('Purn AI');
  console.log(`Back on Purn AI page: ${backHasPurnAI}`);
  results.push({ test: 'Navigate back - Purn AI visible', pass: backHasPurnAI });

  // ========== TEST 4: Scrolling test - send a message ==========
  console.log('\n=== TEST 4: Scrolling Test ===');

  const input = page.locator('input[type="text"], textarea').first();
  if (await input.count() > 0) {
    await input.click();
    await input.fill('Hello, tell me about AI');
    console.log('Typed message in input');

    // Take screenshot before sending
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04a-message-typed.png`, fullPage: false });
    console.log('Screenshot saved: 04a-message-typed.png');

    // Press Enter to send
    await input.press('Enter');
    console.log('Pressed Enter to send');

    // Wait for message to appear and possible response
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04b-message-sent.png`, fullPage: false });
    console.log('Screenshot saved: 04b-message-sent.png');

    // Check if the sent message is visible
    const messageVisible = await page.locator('body').textContent();
    const messageSent = messageVisible.includes('Hello, tell me about AI');
    console.log(`Sent message visible: ${messageSent}`);
    results.push({ test: 'Scrolling - Message visible after send', pass: messageSent });

    // Wait a bit more for AI response and take final screenshot
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04c-after-response.png`, fullPage: false });
    console.log('Screenshot saved: 04c-after-response.png');
  } else {
    console.log('ERROR: Could not find input field');
    results.push({ test: 'Scrolling - Input field found', pass: false });
  }

  // ========== SUMMARY ==========
  console.log('\n========== TEST SUMMARY ==========');
  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    if (r.pass) passed++; else failed++;
    console.log(`  [${status}] ${r.test}`);
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  await browser.close();
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
