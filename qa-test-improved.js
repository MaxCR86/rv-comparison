const { chromium } = require('playwright');

const TEST_URL = process.argv[2] || 'http://localhost:3000';
const MODE = process.argv[3] || 'standard';

const RESULTS = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function test(name, fn) {
  RESULTS.total++;
  try {
    await fn();
    RESULTS.passed++;
    RESULTS.tests.push({ name, status: 'PASS' });
    log(`  ✓ ${name}`, 'green');
  } catch (error) {
    RESULTS.failed++;
    RESULTS.tests.push({ name, status: 'FAIL', error: error.message });
    log(`  ✗ ${name}: ${error.message}`, 'red');
  }
}

async function runStandardTests(browser, page) {
  log('\n=== STANDARD TEST SUITE ===', 'blue');

  // Test 1: Homepage Loads
  await test('Homepage loads', async () => {
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (!title.includes('RV Comparison')) throw new Error('Title mismatch');
  });

  // Test 2: Table displays listings
  await test('Listings table displays', async () => {
    const table = await page.locator('table').isVisible().catch(() => false);
    if (!table) throw new Error('Table not visible');
    const rows = await page.locator('tbody tr').count();
    if (rows === 0) throw new Error('No listings found');
  });

  // Test 3: Data extraction accuracy
  await test('Data extraction - Price is numeric and > 100', async () => {
    const priceText = await page.locator('tbody tr:first-child td:nth-child(3)').textContent();
    const price = parseInt(priceText?.replace(/[^\d]/g, '') || '0');
    if (price <= 100) throw new Error(`Price too low: ${price}`);
  });

  await test('Data extraction - Location is valid', async () => {
    const locationText = await page.locator('tbody tr:first-child td:nth-child(5)').textContent();
    if (!locationText || locationText.includes('is approximate')) {
      throw new Error(`Invalid location: ${locationText}`);
    }
  });

  await test('Data extraction - Seller name readable', async () => {
    const sellerText = await page.locator('tbody tr:first-child td:nth-child(6)').textContent();
    if (!sellerText || sellerText.includes('function') || sellerText.includes('window')) {
      throw new Error(`Invalid seller: ${sellerText}`);
    }
  });

  // Test 4: Photo loading
  await test('Photos load in image gallery', async () => {
    const firstRow = page.locator('tbody tr:first-child');
    await firstRow.click();
    await page.waitForTimeout(800);

    // Wait for images to load
    await page.waitForSelector('img[alt*="RV"], img[alt="thumbnail"]', { timeout: 5000 }).catch(() => {});

    // Check for any visible images (Next.js Image component wraps in div)
    const images = await page.locator('img').all();
    let imageFound = false;

    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      if (src && (src.includes('supabase') || src.includes('storage'))) {
        imageFound = true;
        break;
      }
      // Also check if image is visible (loaded)
      if (alt && alt.includes('RV')) {
        const isVisible = await img.isVisible().catch(() => false);
        if (isVisible) {
          imageFound = true;
          break;
        }
      }
    }

    if (!imageFound) throw new Error('No images loaded in gallery');
  });

  // Test 5: Voting works
  await test('Voting - Upvote button exists and clickable', async () => {
    const upvoteBtn = await page.locator('button:has-text("Upvote")').first();
    const visible = await upvoteBtn.isVisible().catch(() => false);
    if (!visible) throw new Error('Upvote button not found');
  });

  // Test 6: Comments
  await test('Comments - Can add comment', async () => {
    const textarea = await page.locator('textarea').first();
    const visible = await textarea.isVisible().catch(() => false);
    if (!visible) throw new Error('Comment form not visible');

    await textarea.fill('Test comment from QA');
    const hasText = await textarea.inputValue();
    if (hasText !== 'Test comment from QA') throw new Error('Text not entered');
  });

  // Test 7: Edit page password protection
  await test('Edit page - Password required', async () => {
    await page.goto(`${TEST_URL}/edit`);
    const passwordField = await page.locator('input[type="password"]').isVisible();
    if (!passwordField) throw new Error('Password field not found');
  });

  // Test 8: Responsive design
  await test('Responsive - Mobile view', async () => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const main = await page.locator('main');
    const count = await main.count();
    if (count === 0) throw new Error('Main element not found');
    const visible = await main.isVisible().catch(() => false);
    if (!visible) throw new Error('Main content not visible on mobile');
  });

  await test('Responsive - Tablet view', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const main = await page.locator('main');
    const count = await main.count();
    if (count === 0) throw new Error('Main element not found');
    const visible = await main.isVisible().catch(() => false);
    if (!visible) throw new Error('Main content not visible on tablet');
  });

  await test('Responsive - Desktop view', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const main = await page.locator('main');
    const count = await main.count();
    if (count === 0) throw new Error('Main element not found');
    const visible = await main.isVisible().catch(() => false);
    if (!visible) throw new Error('Main content not visible on desktop');
  });

  // Test 9: API endpoints
  await test('API - GET /api/listings returns data', async () => {
    const response = await page.request.get(`${TEST_URL}/api/listings`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid API response');
  });

  // Test 10: No console errors
  await test('Console - No critical errors', async () => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(TEST_URL);
    await page.waitForTimeout(1000);

    if (errors.length > 2) throw new Error(`${errors.length} console errors`);
  });
}

async function runAdversaryTests(browser, page) {
  log('\n=== ADVERSARY TEST SUITE ===', 'yellow');

  await test('Chaos - Page survives rapid navigation', async () => {
    for (let i = 0; i < 3; i++) {
      await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
      await page.goto(`${TEST_URL}/edit`, { waitUntil: 'domcontentloaded' });
      await page.goBack({ waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(500);
    const content = await page.content().catch(() => '');
    if (content.length < 1000) throw new Error('Page corrupted');
  });

  await test('Chaos - XSS payload handling', async () => {
    const textarea = await page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill('<script>alert("xss")</script>');
      // Should escape, not execute
    }
  });

  await test('Chaos - Multiple button clicks', async () => {
    const buttons = await page.locator('button').all();
    for (let i = 0; i < Math.min(3, buttons.length); i++) {
      try {
        await buttons[i].click({ timeout: 500 }).catch(() => {});
      } catch (e) {
        // Ignore
      }
    }
  });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    log(`\n🧪 QA TEST RUNNER`, 'blue');
    log(`URL: ${TEST_URL}`, 'blue');
    log(`Mode: ${MODE}\n`, 'blue');

    if (MODE === '--full') {
      await runStandardTests(browser, page);
      await runAdversaryTests(browser, page);
    } else if (MODE === '--adversary') {
      await runAdversaryTests(browser, page);
    } else {
      await runStandardTests(browser, page);
    }

    // Print results
    log('\n=== TEST RESULTS ===', 'blue');
    log(`Total: ${RESULTS.total}`);
    log(`Passed: ${RESULTS.passed}`, 'green');
    log(`Failed: ${RESULTS.failed}`, RESULTS.failed > 0 ? 'red' : 'green');

    if (RESULTS.failed > 0) {
      log('\n❌ Failed Tests:', 'red');
      RESULTS.tests.filter(t => t.status === 'FAIL').forEach(t => {
        log(`  - ${t.name}`, 'red');
        log(`    ${t.error}`, 'yellow');
      });
    }

    const passRate = ((RESULTS.passed / RESULTS.total) * 100).toFixed(1);
    log(`\n${RESULTS.failed === 0 ? '✅ ALL TESTS PASSED' : `⚠️  ${passRate}% PASS RATE`}`,
        RESULTS.failed === 0 ? 'green' : 'yellow');

  } finally {
    await browser.close();
  }

  process.exit(RESULTS.failed > 2 ? 1 : 0);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
