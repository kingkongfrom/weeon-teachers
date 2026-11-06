import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const b = await page.evaluate(() => {
  for (const el of document.querySelectorAll(".wa-bubble")) {
    const r = el.getBoundingClientRect();
    const cy = r.y + r.height/2;
    if (cy < 130 || cy > window.innerHeight - 180) continue;
    const top = document.elementFromPoint(r.x + r.width - 30, cy);
    if (top && (top === el || el.contains(top))) return { x: r.x + r.width - 30, y: cy };
  }
  return null;
});
const cdp = await context.newCDPSession(page);
/* LONG PRESS via real touch */
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(120);
await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 6, y: b.y + 2 }] });
await page.waitForTimeout(700);
const hold = await page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  const t = m[0]?.textContent || "";
  return { menus: m.length, emojiRow: ["👍","❤️","😂","😮","😢","🙏"].every(e => t.includes(e)), reply: /Responder/.test(t) };
});
console.log("LONG PRESS ->", JSON.stringify(hold));
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(500);
/* RIGHT CLICK via mouse */
await page.mouse.click(b.x, b.y, { button: "right" });
await page.waitForTimeout(600);
const rc = await page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  const t = m[0]?.textContent || "";
  return { menus: m.length, emojiRow: ["👍","❤️","😂","😮","😢","🙏"].every(e => t.includes(e)), reply: /Responder/.test(t) };
});
console.log("RIGHT CLICK ->", JSON.stringify(rc));
await context.close();
