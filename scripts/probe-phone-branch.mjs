import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 200; });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(120);
await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 6, y: b.y + 2 }] });
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  return {
    menus: m.length,
    labels: m.map(x => x.getAttribute("aria-label")),
    text: m.map(x => x.textContent.trim().slice(0, 50)),
    isDesktopMatch: matchMedia("(hover: hover)").matches,
  };
});
console.log(JSON.stringify(r, null, 2));
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await context.close();
