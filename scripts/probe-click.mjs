import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/grupos", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
/* What sits on top of the card centre? */
const probe = await page.evaluate(() => {
  const row = document.querySelector("li");
  const r = row.getBoundingClientRect();
  const pts = [
    ["nameArea", r.x + 120, r.y + 20],
    ["chips", r.x + 200, r.y + 60],
    ["rightSide", r.x + r.width - 300, r.y + r.height/2],
  ];
  return pts.map(([label, x, y]) => {
    const el = document.elementFromPoint(x, y);
    const link = el?.closest("a");
    return { label, top: el?.tagName, cls: (el?.className?.toString?.() || "").slice(0,50), inLink: !!link, href: link?.getAttribute("href") };
  });
});
console.log(JSON.stringify(probe, null, 2));
await context.close();
