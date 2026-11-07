import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 1000 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/mis-evaluaciones", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
await page.screenshot({ path: "probe-mis-eval.png", fullPage: true });
console.log("saved");
await context.close();
