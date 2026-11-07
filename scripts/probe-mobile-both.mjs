import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
for (const [n, u] of [["mobile-grupos","http://localhost:3001/grupos"],["mobile-aula","http://localhost:3001/aula-virtual"]]) {
  await page.goto(u, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `probe-${n}.png`, fullPage: false });
}
await context.close();
