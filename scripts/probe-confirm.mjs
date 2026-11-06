import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);
const b = await page.evaluate(() => {
  for (const el of document.querySelectorAll(".wa-bubble")) {
    const r = el.getBoundingClientRect();
    if (r.y > 110 && r.y < 600) return { x: r.x + r.width - 12, y: r.y + r.height/2 };
  }
  return null;
});
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(50);
await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 60, y: b.y }] });
await page.waitForTimeout(400);
const menu = await page.evaluate(() => ({
  responder: /Responder/.test(document.body.innerText),
  roleMenu: document.querySelectorAll("[role=menu]").length,
}));
console.log("AFTER SWIPE -> Responder visible:", menu.responder, "| role=menu:", menu.roleMenu);
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await context.close();
