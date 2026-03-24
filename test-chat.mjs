import { chromium } from 'playwright';

async function testChat() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  console.log('=== Test 1: Navigate to Purn Cop page ===');
  await page.goto('http://localhost:3000/purn-cop', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Take screenshot of Purn Cop welcome
  await page.screenshot({ path: 'test-screenshots/04-purn-cop-before-chat.png', fullPage: false });
  console.log('Screenshot: 04-purn-cop-before-chat.png');
  
  // Type and send a message
  console.log('=== Test 2: Send a message on Purn Cop ===');
  const textarea = page.locator('textarea');
  await textarea.fill('What is SQL injection? Explain briefly.');
  await page.waitForTimeout(500);
  
  // Click send button
  const sendButton = page.locator('button[aria-label="Send message"]');
  await sendButton.click();
  
  console.log('Message sent, waiting for response...');
  
  // Wait for the response to start streaming (look for assistant message)
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-screenshots/05-purn-cop-streaming.png', fullPage: false });
  console.log('Screenshot: 05-purn-cop-streaming.png (streaming)');
  
  // Wait longer for response to complete
  await page.waitForTimeout(30000);
  await page.screenshot({ path: 'test-screenshots/06-purn-cop-response.png', fullPage: false });
  console.log('Screenshot: 06-purn-cop-response.png (after response)');
  
  // Check if <think> tags are visible in the response
  const pageContent = await page.textContent('body');
  const hasThinkTags = pageContent.includes('<think>') || pageContent.includes('</think>');
  console.log(`Think tags visible in response: ${hasThinkTags ? 'YES (BUG!)' : 'NO (GOOD)'}`);
  
  // Now send a second message to test multi-turn
  console.log('=== Test 3: Send second message (multi-turn test) ===');
  await textarea.fill('Give me a one-line example of a SQL injection payload.');
  await page.waitForTimeout(500);
  await sendButton.click();
  
  console.log('Second message sent, waiting for response...');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-screenshots/07-purn-cop-second-streaming.png', fullPage: false });
  console.log('Screenshot: 07-purn-cop-second-streaming.png (streaming)');
  
  await page.waitForTimeout(30000);
  await page.screenshot({ path: 'test-screenshots/08-purn-cop-second-response.png', fullPage: false });
  console.log('Screenshot: 08-purn-cop-second-response.png (after second response)');
  
  // Check again for think tags in the second response
  const pageContent2 = await page.textContent('body');
  const hasThinkTags2 = pageContent2.includes('<think>') || pageContent2.includes('</think>');
  console.log(`Think tags visible after second response: ${hasThinkTags2 ? 'YES (BUG!)' : 'NO (GOOD)'}`);
  
  await browser.close();
  console.log('\n=== All tests complete ===');
}

testChat().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
