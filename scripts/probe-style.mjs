import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
await page.evaluate(() => { const w = document.querySelector(".chat-wallpaper"); if (w) w.scrollTop = w.scrollHeight; });
await page.waitForTimeout(400);

/* Spy on setDrag by watching the style attribute of the bubble directly. */
const watched = await page.evaluate(() => new Promise((resolve) => {
  const b = document.querySelectorAll(".wa-bubble")[6];
  const r = b.getBoundingClientRect();
  const startX = Math.round(r.x + r.width - 8), startY = Math.round(r.y + r.height/2);
  const styles = [];
  const mo = new MutationObserver(() => styles.push(b.getAttribute("style") || ""));
  mo.observe(b, { attributes: true, attributeFilter: ["style"] });
  const el = document.elementFromPoint(startX, startY);
  const mk = (t,x,y) => new PointerEvent(t, { bubbles:true, cancelable:true, pointerId:1, pointerType:"touch", isPrimary:true, clientX:x, clientY:y, buttons: t==="pointerup"?0:1 });
  el.dispatchEvent(mk("pointerdown", startX, startY));
  for (const dx of [20, 50, 90]) window.dispatchEvent(mk("pointermove", startX-dx, startY));
  window.dispatchEvent(mk("pointerup", startX-90, startY));
  setTimeout(() => { mo.disconnect(); resolve({ styles, final: b.getAttribute("style") }); }, 600);
}));
console.log("style changes during gesture:", JSON.stringify(watched, null, 2));
await context.close();
