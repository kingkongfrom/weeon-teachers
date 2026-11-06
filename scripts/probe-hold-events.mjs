import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 260; });
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
console.log("target:", JSON.stringify(b));
const cdp = await context.newCDPSession(page);
/* Instrument: which events fire on the bubble during a hold? */
await page.evaluate(() => {
  window.__ev = [];
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 260; });
  for (const t of ["pointerdown","pointerup","pointercancel","pointerleave","contextmenu"]) {
    el.addEventListener(t, e => window.__ev.push(t + ":" + (e.pointerType||"")));
  }
});
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(750);
const during = await page.evaluate(() => ({ ev: window.__ev, menus: document.querySelectorAll("[role=menu]").length }));
console.log("DURING hold:", JSON.stringify(during));
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(400);
console.log("AFTER:", JSON.stringify(await page.evaluate(() => ({ ev: window.__ev, menus: document.querySelectorAll("[role=menu]").length }))));
await context.close();
