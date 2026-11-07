import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"],
  headless: true,
  hasTouch: true,
  isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const dims = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
console.log("viewport:", JSON.stringify(dims), "url:", page.url());
await page.screenshot({ path: "probe-phone-mensajes.png" });
await context.close();
