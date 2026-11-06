import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
const logs = [];
page.on("console", m => { const t = m.text(); if (t.includes("gesture:")) logs.push(t); });
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

/* Find a bubble whose CENTER is in the visible transcript area, below the header. */
const target = await page.evaluate(() => {
  const bubbles = [...document.querySelectorAll(".wa-bubble")];
  for (const b of bubbles) {
    const r = b.getBoundingClientRect();
    const cx = r.x + r.width - 12, cy = r.y + r.height / 2;
    if (cy < 90 || cy > 700) continue;
    const top = document.elementFromPoint(cx, cy);
    const inside = top && (top === b || b.contains(top));
    if (inside) return { found: true, x: cx, y: cy, w: r.width, h: r.height, hit: top.className.toString().slice(0,60) };
  }
  return { found: false };
});
console.log("target:", JSON.stringify(target));
if (!target.found) { await context.close(); process.exit(0); }

const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: target.x, y: target.y }] });
await page.waitForTimeout(80);
for (const dx of [18, 45, 80]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: target.x - dx, y: target.y }] });
  await page.waitForTimeout(70);
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(1000);

console.log("\n--- gesture logs ---");
logs.forEach(l => console.log("  " + l.slice(0, 170)));
if (!logs.length) console.log("  (NONE)");

const after = await page.evaluate(() => {
  const el = document.querySelector(".wa-bubble");
  return { transform: el ? getComputedStyle(el).transform : "none", replyStrip: /Responder/.test(document.body.innerText) };
});
console.log("\ntransform:", after.transform, "| reply strip visible:", after.replyStrip);
await page.screenshot({ path: "probe-good-target.png" });
await context.close();
