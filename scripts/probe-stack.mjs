import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
await page.evaluate(() => { const w = document.querySelector(".chat-wallpaper"); if (w) w.scrollTop = w.scrollHeight; });
await page.waitForTimeout(500);

const box = await page.evaluate(() => {
  const b = document.querySelectorAll(".wa-bubble")[6];
  const r = b.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, hit: document.elementFromPoint(r.x + r.width - 10, r.y + r.height/2)?.className?.toString().slice(0,90) };
});
console.log("bubble box:", JSON.stringify(box));

const info = await page.evaluate(({x,y}) => {
  const stack = document.elementsFromPoint(x, y);
  return stack.slice(0, 6).map(el => ({
    tag: el.tagName,
    cls: (el.className?.toString() || "").slice(0, 70),
    pe: getComputedStyle(el).pointerEvents,
  }));
}, { x: box.x + box.w - 10, y: box.y + box.h/2 });
console.log("element stack at point:");
info.forEach(i => console.log(`  ${i.tag.padEnd(5)} pe=${i.pe.padEnd(6)} ${i.cls}`));
await context.close();
