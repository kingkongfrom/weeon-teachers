import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/blooket", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const btn = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(x => /Sin nivel|^\d+°/.test((x.textContent||"").trim()));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2 };
});
if (btn) { await page.mouse.click(btn.x, btn.y); await page.waitForTimeout(700); }
const opts = await page.evaluate(() => {
  const items = [...document.querySelectorAll("[role=menuitem],[role=option],button")].map(e => (e.textContent||"").trim()).filter(t => t && t.length < 20);
  return [...new Set(items)].filter(t => /nivel|°|^\d+$/.test(t));
});
console.log("dropdown options:", JSON.stringify(opts));
await page.screenshot({ path: "probe-nivel-open.png", clip: { x: 300, y: 200, width: 600, height: 400 } });
await context.close();
