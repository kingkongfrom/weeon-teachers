import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
const logs = [];
page.on("console", m => { const t = m.text(); if (t.includes("gesture:")) logs.push(t); });
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
await page.evaluate(() => { const w = document.querySelector(".chat-wallpaper"); if (w) w.scrollTop = w.scrollHeight; });
await page.waitForTimeout(500);

/* A REAL touch via CDP touch emulation, the same path a finger takes. */
const box = await page.evaluate(() => {
  const b = document.querySelectorAll(".wa-bubble")[6];
  const r = b.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const sx = box.x + box.w - 10, sy = box.y + box.h/2;
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sx, y: sy }] });
await page.waitForTimeout(80);
for (const dx of [20, 50, 90]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: sx - dx, y: sy }] });
  await page.waitForTimeout(60);
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(900);

console.log("--- gesture logs (real touch) ---");
logs.forEach(l => console.log("  " + l.slice(0, 160)));
if (!logs.length) console.log("  (NONE)");
await page.screenshot({ path: "probe-real-touch.png" });
await context.close();
