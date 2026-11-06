import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
const logs = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text().slice(0,300)}`));
page.on("pageerror", e => logs.push(`[pageerror] ${e.message.slice(0,300)}`));
page.on("requestfailed", r => logs.push(`[reqfail] ${r.url().slice(0,140)} :: ${r.failure()?.errorText}`));
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const bubbles = await page.locator(".wa-bubble").count();
console.log("bubbles after 9s:", bubbles);
await page.screenshot({ path: "probe-after9s.png" });
console.log("\n--- logs ---");
for (const l of logs.slice(-25)) console.log("  " + l);
await context.close();
