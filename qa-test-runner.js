const { chromium } = require('playwright');

const TEST_URL = process.argv[2] || 'http://localhost:3000';
const MODE = process.argv[3] || 'standard'; // standard, --adversary, --full

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
    const table = await page.locator('table');
    await table.waitFor({ state: 'visible' });
    const rows = await page.locator('tbody tr');
    const count = await rows.count();
    if (count === 0) throw new Error('No listings found');
  });

  // Test 3: Data extraction accuracy
  await test('Data extraction - Price shows realistic value', async () => {
    const priceCell = await page.locator('tbody tr:first-child td:nth-child(3)').textContent();
    const price = parseInt(priceCell?.replace(/[^\d]/g, '') || '0');
    if (price <= 100) throw new Error(`Price too low: ${price}`);
  });

  await test('Data extraction - Location not "is approximate"', async () => {
    const locationCell = await page.locator('tbody tr:first-child td:nth-child(5)').textContent();
    if (!locationCell || locationCell.includes('is approximate')) {
      throw new Error(`Invalid location: ${locationCell}`);
    }
  });

  await test('Data extraction - Seller name is readable', async () => {
    const sellerCell = await page.locator('tbody tr:first-child td:nth-child(6)').textContent();
    if (!sellerCell || sellerCell.includes('function') || sellerCell.includes('window')) {
      throw new Error(`Invalid seller: ${sellerCell}`);
    }
  });

  // Test 4: Photo loading
  await test('Photos load in image gallery', async () => {
    await page.locator('tbody tr:first-child').click();
    await page.locator('img').first().waitFor({ state: 'visible' });
    const src = await page.locator('img').first().getAttribute('src');
    if (!src) throw new Error('No image src found');
  });

  // Test 5: Voting works
  await test('Voting - Upvote increases rating', async () => {
    const ratingBefore = await page.locator('[data-testid*="rating"]').textContent();
    await page.locator('button:has-text("↑")').click();
    await page.waitForTimeout(500);
    const ratingAfter = await page.locator('[data-testid*="rating"]').textContent();
    if (ratingBefore === ratingAfter) throw new Error('Rating did not change');
  });

  // Test 6: Comments
  await test('Comments - Can add comment', async () => {
    const commentForm = await page.locator('textarea').first();
    await commentForm.fill('Test comment');
    await page.locator('button:has-text("Submit")').click();
    await page.waitForTimeout(500);
    const comment = await page.locator('text=Test comment');
    await comment.waitFor({ state: 'visible' });
  });

  // Test 7: Responsive design
  await test('Responsive - Mobile view (320px)', async () => {
    await page.setViewportSize({ width: 320, height: 568 });
    const table = await page.locator('table');
    const isVisible = await table.isVisible().catch(() => false);
    if (!isVisible) {
      // Mobile might hide table, check for alternative view
      const content = await page.locator('main').isVisible();
      if (!content) throw new Error('No content visible on mobile');
    }
  });

  await test('Responsive - Tablet view (768px)', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const content = await page.locator('main');
    await content.waitFor({ state: 'visible' });
  });

  await test('Responsive - Desktop view (1024px)', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const table = await page.locator('table');
    await table.waitFor({ state: 'visible' });
  });

  // Test 8: Edit page password protection
  await test('Edit page - Password protection blocks access', async () => {
    await page.goto(`${TEST_URL}/edit`);
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    if (!passwordInput) throw new Error('Password prompt not visible');
  });

  await test('Edit page - Wrong password rejected', async () => {
    const passwordInput = await page.locator('input[type="password"]');
    await passwordInput.fill('WrongPassword');
    await page.locator('button:has-text("Submit")').click();
    const error = await page.locator('text=Invalid').isVisible().catch(() => false);
    if (!error) throw new Error('Error message not shown');
  });

  await test('Edit page - Correct password accepted', async () => {
    const passwordInput = await page.locator('input[type="password"]');
    await passwordInput.clear();
    await passwordInput.fill('ThisIsHe');
    await page.locator('button:has-text("Submit")').click();
    await page.waitForTimeout(500);
    const addForm = await page.locator('input[placeholder*="facebook"]').isVisible();
    if (!addForm) throw new Error('Add listing form not visible');
  });

  // Test 9: Data persistence
  await test('Data persistence - Ratings persist after reload', async () => {
    await page.goto(TEST_URL);
    const rating1 = await page.locator('tbody tr:first-child [data-testid*="rating"]').textContent();
    await page.reload();
    const rating2 = await page.locator('tbody tr:first-child [data-testid*="rating"]').textContent();
    if (rating1 !== rating2) throw new Error('Rating changed after reload');
  });

  // Test 10: API endpoints
  await test('API - GET /api/listings returns listings', async () => {
    const response = await page.request.get(`${TEST_URL}/api/listings`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Invalid API response');
  });
}

async function runAdversaryTests(browser, page) {
  log('\n=== ADVERSARY TEST SUITE (Chaos Mode) ===', 'yellow');

  await test('Adversary - Rapid clicking on buttons', async () => {
    const buttons = await page.locator('button').all();
    for (let i = 0; i < Math.min(5, buttons.length); i++) {
      try {
        await buttons[i].click({ force: true });
      } catch (e) {
        // Ignore click errors
      }
    }
    const pageContent = await page.content();
    if (pageContent.length < 100) throw new Error('Page corrupted');
  });

  await test('Adversary - XSS payload in comment', async () => {
    await page.locator('textarea').first().fill('<script>alert("xss")</script>');
    await page.locator('button:has-text("Submit")').click();
    await page.waitForTimeout(200);
    // Should escape the payload
    const alerts = await page.evaluate(() => window.alertCount || 0);
    if (alerts > 0) throw new Error('XSS vulnerability detected');
  });

  await test('Adversary - Back/forward navigation stability', async () => {
    await page.goto(`${TEST_URL}`);
    await page.goto(`${TEST_URL}/edit`);
    await page.goBack();
    await page.goForward();
    const content = await page.content();
    if (content.length < 100) throw new Error('Navigation caused corruption');
  });

  await test('Adversary - Network error recovery', async () => {
    await page.route('**/api/**', route => {
      if (Math.random() > 0.5) {
        route.abort();
      } else {
        route.continue();
      }
    });
    await page.goto(TEST_URL);
    const content = await page.content();
    if (content.length < 100) throw new Error('App not resilient to network errors');
  });

  await test('Adversary - Memory stability', async () => {
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForTimeout(200);
    }
    const metrics = await page.evaluate(() => ({
      memory: performance.memory?.usedJSHeapSize || 0
    }));
    log(`    Memory: ${(metrics.memory / 1024 / 1024).toFixed(2)}MB`);
  });
}

async function runFullTests(browser, page) {
  log('\n=== FULL TEST SUITE ===', 'blue');

  // Discovery phase
  log('\nPhase 1: Discovery', 'yellow');
  const elements = {
    buttons: await page.locator('button').count(),
    inputs: await page.locator('input').count(),
    images: await page.locator('img').count(),
    links: await page.locator('a').count()
  };
  log(`  Found: ${elements.buttons} buttons, ${elements.inputs} inputs, ${elements.images} images, ${elements.links} links`, 'blue');

  // Standard tests
  log('\nPhase 2: Standard Tests', 'yellow');
  await runStandardTests(browser, page);

  // Adversary tests
  log('\nPhase 3: Chaos Tests', 'yellow');
  await runAdversaryTests(browser, page);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    log(`\nQA TEST RUNNER - ${TEST_URL}`, 'blue');
    log(`Mode: ${MODE}\n`, 'blue');

    if (MODE === '--full') {
      await runFullTests(browser, page);
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
      log('\nFailed Tests:', 'red');
      RESULTS.tests.filter(t => t.status === 'FAIL').forEach(t => {
        log(`  - ${t.name}: ${t.error}`, 'red');
      });
    }

    log(`\n${RESULTS.failed === 0 ? '✓ ALL TESTS PASSED' : '✗ TESTS FAILED'}`,
        RESULTS.failed === 0 ? 'green' : 'red');

  } finally {
    await browser.close();
  }

  process.exit(RESULTS.failed > 0 ? 1 : 0);
}

main().catch(err => {
  log(`Fatal error: ${err.message}`, 'red');
  process.exit(1);
});
