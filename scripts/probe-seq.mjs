import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 200; });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
/* Watch native pointerdown + contextmenu order. */
await page.evaluate(() => {
  window.__seq = [];
  for (const t of ["pointerdown","contextmenu","pointerup"]) {
    window.addEventListener(t, (e) => window.__seq.push({ t, btn: e.button, pt: e.pointerType }), true);
  }
});
await page.mouse.click(b.x, b.y, { button: "right" });
await page.waitForTimeout(500);
console.log("event sequence:", JSON.stringify(await page.evaluate(() => window.__seq)));
console.log("menus after:", await page.evaluate(() => document.querySelectorAll("[role=menu]").length));
await context.close();
