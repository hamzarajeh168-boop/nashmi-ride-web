export async function run(page) {
  await page.goto('http://localhost:4000/passenger');
  await page.waitForTimeout(1000);
  // Switch to register step
  await page.locator('#showRegister').click();
  await page.waitForTimeout(500);
  const phone = '079111' + Math.floor(1000 + Math.random() * 9000);
  await page.locator('#regName').fill('TestRiderQA');
  await page.locator('#regPhone').fill(phone);
  await page.locator('#regPassword').fill('123456');
  await page.locator('#register').click();
  await page.waitForTimeout(2000);
  const msg = await page.locator('#regMsg').textContent();
  // After successful registration the UI auto-switches back to login step,
  // so #backAuth is no longer visible. Only click it if register failed.
  const onAuthStep = await page.locator('#authStep.active').count();
  if (!onAuthStep) {
    await page.locator('#backAuth').click();
  }
  await page.locator('#phone').fill(phone);
  await page.locator('#password').fill('123456');
  await page.locator('#login').click();
  await page.waitForTimeout(2500);
  const rideActive = await page.locator('#rideScreen.active').count();
  const name = await page.locator('#customerName').textContent().catch(() => 'N/A');
  return {
    phone,
    registerMsg: msg,
    autoSwitchedToLogin: onAuthStep > 0,
    loginSuccess: rideActive > 0,
    displayName: name
  };
}

