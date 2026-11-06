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
    window.addEventListener(t, (e) => {
      const el = e.target;
      window.__events.push({ type:t, pt:e.pointerType, x:Math.round(e.clientX),
        isBubble: !!(el && el.className && el.className.toString().includes("wa-bubble")) });
    }, true);
  }
});

/* Scroll the transcript so bubbles are on screen. */
await page.evaluate(() => {
  const w = document.querySelector(".chat-wallpaper");
  if (w) w.scrollTop = w.scrollHeight;
});
await page.waitForTimeout(500);

const bubbles = page.locator(".wa-bubble");
const n = await bubbles.count();
let box = null, idx = -1;
for (let i = n - 1; i >= 0; i--) {
  const b = await bubbles.nth(i).boundingBox();
  if (b && b.y > 70 && b.y + b.height < 760) { idx = i; box = b; break; }
}
console.log("bubbles:", n, "| chosen index:", idx, "| box:", JSON.stringify(box));
if (!box) { await context.close(); process.exit(0); }

const startX = Math.round(box.x + box.width - 8);
const startY = Math.round(box.y + box.height/2);
const target = await page.evaluate(({x,y}) => {
  const el = document.elementFromPoint(x,y);
  return el ? el.className.toString().slice(0,70) : "NULL";
}, {x:startX,y:startY});
console.log("target at start:", target);

await page.evaluate(({startX,startY}) => {
  const el = document.elementFromPoint(startX,startY);
  const mk = (type,x,y) => new PointerEvent(type, {
    bubbles:true, cancelable:true, composed:true, pointerId:1, pointerType:"touch",
    isPrimary:true, clientX:x, clientY:y, buttons: type==="pointerup"?0:1,
  });
  el.dispatchEvent(mk("pointerdown",startX,startY));
  for (const dx of [6,18,34,52,74,96]) window.dispatchEvent(mk("pointermove",startX-dx,startY));
  window.dispatchEvent(mk("pointerup",startX-96,startY));
}, {startX,startY});

await page.waitForTimeout(700);
const events = await page.evaluate(() => window.__events);
console.log("\n--- pointer events (isBubble = target inside a bubble) ---");
for (const e of events) console.log(`  ${e.type.padEnd(14)} x=${e.x} isBubble=${e.isBubble}`);

const res = await page.evaluate(() => {
  const el = document.querySelector(".wa-bubble");
  return { transform: el ? getComputedStyle(el).transform : "none",
           replyStrip: /Responder/.test(document.body.innerText) };
});
console.log("\ntransform:", res.transform, "| reply strip:", res.replyStrip);
await page.screenshot({ path: "probe-final.png" });
await context.close();
