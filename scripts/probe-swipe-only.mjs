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
    const cx = r.x + r.width - 40, cy = r.y + r.height/2;
    if (cy < 140 || cy > 500) continue;
    const top = document.elementFromPoint(cx, cy);
    if (top && (top === el || el.contains(top))) return { x: cx, y: cy };
  }
  return null;
});
console.log("target:", JSON.stringify(b));
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(40);
for (const dx of [12, 30, 55, 85]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - dx, y: b.y }] });
  await page.waitForTimeout(40);
}
await page.waitForTimeout(500);
const r = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].filter(x => x.getAttribute("aria-label")?.toLowerCase().includes("cancel"));
  const ta = document.querySelector("textarea");
  return {
    menus: document.querySelectorAll("[role=menu]").length,
    activeTag: document.activeElement?.tagName,
    composerHasQuote: !!(ta && ta.closest("div")?.parentElement?.parentElement?.innerText?.match(/Rodrigo Acosta Martínez/)),
    bodyTail: document.body.innerText.slice(-260).replace(/\n+/g," | "),
  };
});
console.log(JSON.stringify(r, null, 2));
await page.screenshot({ path: "probe-swipe-only.png" });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await context.close();
