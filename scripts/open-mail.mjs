import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  headless: false,
  viewport: { width: 1400, height: 950 },
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
console.log("opened:", page.url());
/* Keep the window alive until the profile is signed in, then exit cleanly. */
await page.waitForTimeout(180000);
await context.close();
