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
await page.mouse.click(b.x, b.y, { button: "right" });
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const m = document.querySelector("[role=menu]");
  const btn = [...(m?.querySelectorAll("button") || [])].find(x => /Responder/.test(x.textContent || ""));
  const r = btn?.getBoundingClientRect();
  return r ? { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height } : null;
});
console.log("button rect:", JSON.stringify(info));
/* Does the button survive a pointerdown? */
await page.evaluate(() => { window.__menuGone = false; const o = new MutationObserver(() => { if (!document.querySelector("[role=menu]")) window.__menuGone = true; }); o.observe(document.body, { childList: true, subtree: true }); });
await page.mouse.move(info.x, info.y);
await page.mouse.down();
await page.waitForTimeout(200);
console.log("menu after pointerdown:", await page.evaluate(() => document.querySelectorAll("[role=menu]").length));
await page.mouse.up();
await page.waitForTimeout(600);
console.log("strip after full click:", await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  return (ta?.closest("div")?.parentElement?.innerText || "").slice(0, 100).replace(/\n/g," | ");
}));
await context.close();
