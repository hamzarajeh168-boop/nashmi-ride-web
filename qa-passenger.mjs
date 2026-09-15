export async function run(page) {
  const results = {};

  await page.goto('http://localhost:4000/passenger');
  await page.waitForTimeout(1000);

  console.log('--- STEP 1: click #showRegister');
  await page.locator('#showRegister').click();
  await page.waitForTimeout(500);
  console.log('reg screen active:', await page.locator('#registerScreen.active').count());

  console.log('--- STEP 2: fill registration');
  const phone = '079111' + Math.floor(1000 + Math.random() * 9000);
  await page.locator('#regName').fill('TestRiderQA');
  await page.locator('#regPhone').fill(phone);
  await page.locator('#regPassword').fill('123456');
  console.log('--- STEP 3: click #register');
  await page.locator('#register').click();
  await page.waitForTimeout(2000);
  results.registerMsg = (await page.locator('#regMsg').textContent().catch(() => 'N/A')).trim();
  console.log('regMsg:', results.registerMsg);

  console.log('--- STEP 4: click #backAuth');
  await page.locator('#backAuth:visible').first().click({ force: true }).catch(async () => { await page.evaluate(() => document.getElementById('backAuth').click()); });
  await page.waitForTimeout(500);
  console.log('login screen active:', await page.locator('#loginScreen.active').count());

  console.log('--- STEP 5: login');
  await page.locator('#phone').fill(phone);
  await page.locator('#password').fill('123456');
  await page.locator('#login').click();
  await page.waitForTimeout(2500);
  results.loginSuccess = (await page.locator('#rideScreen.active').count()) > 0;
  results.customerName = (await page.locator('#customerName').textContent().catch(() => 'N/A')).trim();
  results.loginMsg = (await page.locator('#loginMsg').textContent().catch(() => 'N/A')).trim();
  console.log('rideScreen active:', results.loginSuccess);
  console.log('customerName:', results.customerName);
  console.log('loginMsg:', results.loginMsg);

  await page.screenshot({ path: 'qa-passenger-final.png' });
  return results;
}

