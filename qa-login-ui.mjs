export default async function run(page, ui) {
  await ui.fill('@e1', '0790905612');
  await ui.fill('@e2', '123456');
  await ui.click('@e3');
  await page.waitForTimeout(2500);
  const after = await ui.snapshot();
  return { after };
}
