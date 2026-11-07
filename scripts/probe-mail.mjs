import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 950 } });
const page = context.pages()[0] ?? await context.newPage();
for (const [n, u] of [["correo","http://localhost:3001/comunicacion/correo"],["mensajes","http://localhost:3001/comunicacion/mensajes"]]) {
  await page.goto(u, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `probe-${n}.png` });
  console.log(n, page.url());
}
await context.close();
