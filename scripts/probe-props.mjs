import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);

const b = await page.evaluate(() => {
  for (const el of document.querySelectorAll(".wa-bubble")) {
    const r = el.getBoundingClientRect();
    const cy = r.y + r.height/2;
    if (cy < 130 || cy > window.innerHeight - 200) continue;
    return { x: r.x + r.width - 30, y: cy };
  }
  return null;
});

/* What React gave the bubble: only onContextMenu, or onPointerDown too? */
const props = await page.evaluate((pt) => {
  const el = document.elementFromPoint(pt.x, pt.y)?.closest(".wa-bubble");
  if (!el) return { err: "no bubble" };
  const k = Object.keys(el).find(x => x.startsWith("__reactProps"));
  return { keys: k ? Object.keys(el[k]).filter(p => p.startsWith("on")) : [] };
}, b);
console.log("bubble React props:", JSON.stringify(props));

/* Does matchMedia say hover? */
const hover = await page.evaluate(() => ({
  none: matchMedia("(hover: none)").matches,
  hover: matchMedia("(hover: hover)").matches,
  coarse: matchMedia("(pointer: coarse)").matches,
  w: innerWidth,
}));
console.log("media:", JSON.stringify(hover));
await context.close();
