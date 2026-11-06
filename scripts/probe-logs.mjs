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
await page.waitForTimeout(400);

const box = await page.evaluate(() => {
  const b = document.querySelectorAll(".wa-bubble")[6];
  const r = b.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const sx = Math.round(box.x + box.w - 8), sy = Math.round(box.y + box.h/2);
await page.evaluate(({sx,sy}) => {
  const el = document.elementFromPoint(sx,sy);
  const mk = (t,x,y) => new PointerEvent(t, { bubbles:true, cancelable:true, pointerId:1, pointerType:"touch", isPrimary:true, clientX:x, clientY:y, buttons: t==="pointerup"?0:1 });
  el.dispatchEvent(mk("pointerdown", sx, sy));
  for (const dx of [20, 50, 90]) window.dispatchEvent(mk("pointermove", sx-dx, sy));
  window.dispatchEvent(mk("pointerup", sx-90, sy));
}, {sx,sy});
await page.waitForTimeout(800);
console.log("--- gesture logs ---");
logs.forEach(l => console.log("  " + l));
if (logs.length === 0) console.log("  (NONE — pointerdown never reached the hook)");
await context.close();
