import { chromium, devices } from "playwright";
/* Hold then RELEASE, and check the row is there after release. */
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(11000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 260; });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(120);
await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 4, y: b.y + 3 }] });
await page.waitForTimeout(700);
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(600);
const after = await page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  const t = m[0]?.textContent || "";
  return { menus: m.length, emojiRow: ["👍","❤️","😂","😮","😢","🙏"].every(e => t.includes(e)), reply: /Responder/.test(t) };
});
console.log("LIFT after release ->", JSON.stringify(after));
await context.close();
