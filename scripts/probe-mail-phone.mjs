import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
for (const [n, u] of [["m-inbox","http://localhost:3001/comunicacion/mensajes"],["m-nuevo","http://localhost:3001/comunicacion/nuevo"]]) {
  await page.goto(u, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  console.log(n, "->", page.url());
  await page.screenshot({ path: `probe-${n}.png`, fullPage: false });
}
await context.close();
