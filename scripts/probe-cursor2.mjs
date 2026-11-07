import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/grupos", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(8000);
const r = await page.evaluate(() => {
  const row = document.querySelector("li > div");
  const b = row.getBoundingClientRect();
  const el = document.elementFromPoint(b.x + b.width * 0.5, b.y + b.height * 0.6);
  const after = el ? getComputedStyle(el, "::after").cursor : null;
  return {
    topEl: el?.tagName,
    elCursor: el ? getComputedStyle(el).cursor : null,
    afterCursor: after,
    inLink: !!el?.closest("a"),
  };
});
console.log(JSON.stringify(r, null, 2));
await context.close();
