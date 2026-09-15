import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
import path from 'path';

const script = process.argv[2];
if (!script) { console.error('Usage: node qa-run.mjs <script.mjs>'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

try {
  const mod = await import(pathToFileURL(path.resolve(script)).href);
  const result = await mod.run(page);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
