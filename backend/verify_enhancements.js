require('dotenv').config();
const { executeTool } = require('./tools');

async function verifyEnhancements() {
  console.log('--- Verifying Enhanced Screen Reading ---');

  // 1. Verify Desktop Capture
  console.log('\nTesting capture_desktop...');
  try {
    const desktopResult = await executeTool('capture_desktop', {});
    console.log('✓ Desktop Capture Result:', desktopResult.substring(0, 200) + '...');
  } catch (e) {
    console.error('✗ Desktop Capture Failed:', e.message);
  }

  // 2. Verify Selenium Scrolling and Capture
  console.log('\nTesting selenium_web_automation (navigate -> scroll -> capture)...');
  try {
    // Navigate
    await executeTool('selenium_web_automation', { action: 'navigate', target: 'https://www.google.com' });
    console.log('✓ Navigated to google.com');

    // Scroll Down
    const scrollDown = await executeTool('selenium_web_automation', { action: 'scroll_down', target: '', value: '300' });
    console.log('✓ Scroll Down Result:', scrollDown);

    // Scroll Up
    const scrollUp = await executeTool('selenium_web_automation', { action: 'scroll_up', target: '', value: '150' });
    console.log('✓ Scroll Up Result:', scrollUp);

    // Capture Page (This also tests analyze_image internally)
    console.log('Attempting capture_page (this uses Vision AI)...');
    const captureResult = await executeTool('selenium_web_automation', { action: 'capture_page', target: '' });
    console.log('✓ Capture Page Result:', captureResult.substring(0, 300) + '...');

    // Close
    await executeTool('selenium_web_automation', { action: 'close', target: '' });
    console.log('✓ Browser closed.');
  } catch (e) {
    console.error('✗ Selenium Verification Failed:', e.message);
  }
}

verifyEnhancements();
