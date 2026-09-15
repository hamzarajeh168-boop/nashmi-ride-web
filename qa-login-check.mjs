export async function run(page) {
  await page.goto('http://localhost:4000/passenger');
  await page.waitForTimeout(1000);
  await page.locator('#phone').fill('0791116889');
  await page.locator('#password').fill('123456');
  await page.locator('#login').click();
  await page.waitForTimeout(2500);
  const rideActive = await page.locator('#rideScreen.active').count();
  const result = {
    rideActive,
    name: await page.locator('#customerName').textContent().catch(() => 'N/A'),
    loginMsg: await page.locator('#loginMsg, #authMsg, #msg').first().textContent().catch(() => null),
    phoneValue: await page.locator('#phone').inputValue().catch(() => null)
  };
  if (!rideActive) {
    await page.screenshot({ path: 'qa-login-fail.png' });
    result.screenshot = 'qa-login-fail.png';
  }
  return result;
}


