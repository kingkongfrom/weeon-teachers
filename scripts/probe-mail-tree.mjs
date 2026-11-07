import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const pane = document.querySelector(".comms-fill");
  const out = [];
  const walk = (el, depth) => {
    if (depth > 6) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({ d: depth, tag: el.tagName, cls: (el.className?.toString?.() || "").slice(0, 46), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), of: cs.overflowY });
    for (const c of el.children) walk(c, depth + 1);
  };
  if (pane) walk(pane, 0);
  return out.filter(o => o.h > 0).slice(0, 18);
});
for (const o of m) console.log(`${"  ".repeat(o.d)}${o.tag} top=${o.top} bottom=${o.bottom} h=${o.h} of=${o.of} | ${o.cls}`);
await context.close();
