import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

await page.evaluate(() => {
  window.__events = [];
  for (const t of ["pointerdown","pointermove","pointerup","pointercancel"]) {
    window.addEventListener(t, (e) => window.__events.push({
      type: t, pt: e.pointerType, x: Math.round(e.clientX), y: Math.round(e.clientY),
    }), true);
  }
});

const bubbles = page.locator(".wa-bubble");
const n = await bubbles.count();
console.log("bubbles:", n);
let idx = -1, box = null;
for (let i = 0; i < n; i++) {
  const b = await bubbles.nth(i).boundingBox();
  if (b && b.y > 60 && b.y + b.height < 780) { idx = i; box = b; break; }
}
console.log("visible bubble index:", idx, "box:", JSON.stringify(box));
if (!box) { console.log("no visible bubble"); await context.close(); process.exit(0); }

const startX = Math.round(box.x + box.width - 8);
const startY = Math.round(box.y + box.height / 2);
const hit = await page.evaluate(({x,y}) => {
  const el = document.elementFromPoint(x,y);
  return el ? el.className.toString().slice(0,80) : "NULL";
}, {x:startX,y:startY});
console.log("element at start point:", hit);

await page.evaluate(({startX,startY}) => {
  const el = document.elementFromPoint(startX,startY);
  const mk = (type,x,y) => new PointerEvent(type, {
    bubbles:true, cancelable:true, composed:true, pointerId:1,
    pointerType:"touch", isPrimary:true, clientX:x, clientY:y,
    buttons: type === "pointerup" ? 0 : 1,
  });
  el.dispatchEvent(mk("pointerdown",startX,startY));
  for (const dx of [6,18,34,52,74,96]) window.dispatchEvent(mk("pointermove",startX-dx,startY));
  window.dispatchEvent(mk("pointerup",startX-96,startY));
}, {startX,startY});

await page.waitForTimeout(700);
const events = await page.evaluate(() => window.__events);
console.log("\n--- pointer events ---");
for (const e of events) console.log(`  ${e.type.padEnd(14)} ${String(e.pt).padEnd(6)} x=${e.x} y=${e.y}`);

const state = await page.evaluate(() => {
  const el = document.querySelector(".wa-bubble");
  const ta = el ? getComputedStyle(el).transform : "none";
  return { transform: ta, bodyHasResponder: /Responder/.test(document.body.innerText) };
});
console.log("\ntransform:", state.transform);
console.log("reply strip visible:", state.bodyHasResponder);
await page.screenshot({ path: "probe-swipe-result.png" });
await context.close();
