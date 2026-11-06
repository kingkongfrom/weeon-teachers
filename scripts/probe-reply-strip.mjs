import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 260; });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
/* right-click -> popover -> Responder */
await page.mouse.click(b.x, b.y, { button: "right" });
await page.waitForTimeout(600);
const btn = await page.evaluate(() => {
  const m = document.querySelector("[role=menu]");
  const el = [...(m?.querySelectorAll("button") || [])].find(x => /Responder/.test(x.textContent || ""));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2 };
});
console.log("Responder button:", JSON.stringify(btn));
if (btn) { await page.mouse.click(btn.x, btn.y); await page.waitForTimeout(500); }
const strip = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const box = ta?.closest("div")?.parentElement;
  return { text: (box?.innerText || "").slice(0, 120).replace(/\n/g, " | ") };
});
console.log("after clicking Responder:", JSON.stringify(strip));
await context.close();
