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
    if (r.y > 120 && r.y < 560) return { x: r.x + r.width - 30, y: r.y + r.height/2 };
  }
  return null;
});
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(40);
for (const dx of [12, 30, 55, 85]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - dx, y: b.y }] });
  await page.waitForTimeout(40);
}
await page.waitForTimeout(450);
const r = await page.evaluate(() => ({
  menus: document.querySelectorAll("[role=menu]").length,
  quoteStrip: !!(document.querySelector("textarea")?.closest("div")?.parentElement?.innerText || "").match(/Rodrigo|Prof/),
  bodyHasQuote: /Prof, a que hora|Prof, a qué hora/.test(document.body.innerText),
  activeIsTextarea: document.activeElement?.tagName === "TEXTAREA",
}));
console.log("AFTER SWIPE:", JSON.stringify(r, null, 2));
await page.screenshot({ path: "probe-direct-reply.png" });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await context.close();
