import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Navigating to Purn AI...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Type a message that will trigger a well-formatted response with headings & emojis
  const textarea = page.locator('textarea');
  await textarea.fill('What is machine learning? Give me a structured overview with key concepts, types, and real-world applications.');

  console.log('Sending message...');
  await page.locator('button[aria-label="Send message"]').click();

  // Wait for streaming to start
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-screenshots/09-styled-streaming.png', fullPage: false });
  console.log('Screenshot: streaming response');

  // Wait for response to complete (streaming stops)
  let attempts = 0;
  while (attempts < 60) {
    const dots = await page.locator('.animate-bounce').count();
    const streamingText = await page.locator('.ai-response').count();

    if (streamingText > 0) {
      // Check if streaming is done by looking for the absence of bounce dots
      const bounceDots = await page.locator('.animate-bounce').count();
      if (bounceDots === 0) {
        // Double-check after a brief wait
        await page.waitForTimeout(2000);
        const stillBouncing = await page.locator('.animate-bounce').count();
        if (stillBouncing === 0) break;
      }
    }

    await page.waitForTimeout(2000);
    attempts++;
  }

  await page.waitForTimeout(1000);

  // Take full screenshot of the styled response
  await page.screenshot({ path: 'test-screenshots/10-styled-response-complete.png', fullPage: false });
  console.log('Screenshot: complete styled response');

  // Scroll down to see more of the response
  const main = page.locator('main');
  await main.evaluate(el => el.scrollTop = el.scrollHeight);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-screenshots/11-styled-response-scrolled.png', fullPage: false });
  console.log('Screenshot: scrolled response');

  // Check if headings are rendered with proper sizes
  const h2Count = await page.locator('.ai-response h2').count();
  const h3Count = await page.locator('.ai-response h3').count();
  const strongCount = await page.locator('.ai-response strong').count();
  const listCount = await page.locator('.ai-response li').count();
  const blockquoteCount = await page.locator('.ai-response blockquote').count();

  console.log(`\n--- Styled Response Analysis ---`);
  console.log(`H2 headings found: ${h2Count}`);
  console.log(`H3 headings found: ${h3Count}`);
  console.log(`Bold/strong elements: ${strongCount}`);
  console.log(`List items: ${listCount}`);
  console.log(`Blockquotes: ${blockquoteCount}`);

  // Check if emojis are present in the response text
  const responseText = await page.locator('.ai-response').first().textContent();
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FAFF}]/u;
  const hasEmojis = emojiRegex.test(responseText || '');
  console.log(`Emojis in response: ${hasEmojis ? 'YES ✅' : 'NO ❌'}`);

  console.log('\nDone! Check test-screenshots/ for results.');

  await browser.close();
})();
