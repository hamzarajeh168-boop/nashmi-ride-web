export async function run(page) {
  await page.goto('http://localhost:4000/passenger');
  await page.waitForTimeout(1500);
  const result = {};

  // 1) Login works
  await page.locator('#phone').fill('0791116889');
  await page.locator('#password').fill('123456');
  await page.locator('#login').click();
  await page.waitForTimeout(2500);
  result.login = {
    rideActive: (await page.locator('#rideScreen.active').count()) > 0,
    name: await page.locator('#customerName').textContent().catch(() => 'N/A')
  };

  // 2) Language toggle
  const langBtn = page.locator('#langToggle').first();
  if (await langBtn.count()) {
    const before = await page.locator('body').textContent();
    await langBtn.click();
    await page.waitForTimeout(800);
    const after = await page.locator('body').textContent();
    result.langToggle = { works: before !== after, dir: await page.locator('html').getAttribute('dir') };
    await langBtn.click(); // back to Arabic
    await page.waitForTimeout(500);
  } else {
    result.langToggle = { exists: false };
  }

  // 3) Light mode toggle
  const themeBtn = page.locator('#themeToggle').first();
  if (await themeBtn.count()) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    result.lightMode = await page.evaluate(() => document.documentElement.classList.contains('light') || document.body.classList.contains('light'));
    await themeBtn.click();
    await page.waitForTimeout(300);
  } else {
    result.lightMode = 'no-toggle-button';
  }

  // 4) SVG icons present (no placeholder chars)
  result.svgIcons = await page.locator('svg').count();
  result.placeholderChars = await page.evaluate(() => /[\u2650-\u2657\u25A3\u25A7]/.test(document.body.textContent));

  // 5) Leaflet map present
  result.map = await page.evaluate(() => !!document.querySelector('#map, .leaflet-container, #rideMap'));

  // 6) Console errors
  return result;
}
