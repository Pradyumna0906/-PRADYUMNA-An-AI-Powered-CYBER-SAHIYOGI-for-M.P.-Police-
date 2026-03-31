const { Builder } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const chrome = require('selenium-webdriver/chrome');

async function testSelenium() {
  console.log("--- J.A.R.V.I.S. SELENIUM DIAGNOSTICS ---");

  // TEST 1: EDGE
  console.log("\n[TEST 1] Attempting to start MS Edge...");
  try {
    const options = new edge.Options();
    options.addArguments('--headless=new'); // Use headless for quick test
    const driver = await new Builder()
      .forBrowser('edge')
      .setEdgeOptions(options)
      .build();
    console.log("✅ SUCCESS: MS Edge Driver is working.");
    await driver.quit();
  } catch (err) {
    console.error(`❌ FAILED: MS Edge error: ${err.message}`);
  }

  // TEST 2: CHROME
  console.log("\n[TEST 2] Attempting to start Google Chrome...");
  try {
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    console.log("✅ SUCCESS: Google Chrome Driver is working.");
    await driver.quit();
  } catch (err) {
    console.error(`❌ FAILED: Google Chrome error: ${err.message}`);
  }

  console.log("\n--- DIAGNOSTICS COMPLETE ---");
}

testSelenium();
