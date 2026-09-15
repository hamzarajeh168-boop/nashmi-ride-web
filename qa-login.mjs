export default async function run(page, ui) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.locator('#phone').fill('0790905611');
  await page.locator('#password').fill('123456');
  await page.locator('#login').click();
  await page.waitForTimeout(2500);
  const after = await ui.snapshot({ full: true });
  return { after, errors };
}