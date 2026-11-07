import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/blooket", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const info = await page.evaluate(() => {
  const sel = [...document.querySelectorAll("button")].find(b => /Nivel|Sin nivel|8°/.test(b.textContent || ""));
  return { found: !!sel, text: sel?.textContent?.trim().slice(0, 40), hasInput: !!document.querySelector("#blooket-grade") };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: "probe-nivel.png", clip: { x: 300, y: 100, width: 800, height: 420 } });
await context.close();
