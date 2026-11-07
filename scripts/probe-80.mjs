import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1560, height: 846 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const sec = document.querySelector(".comms-fill section");
  const out = [];
  for (let el = sec; el && el !== document.body; el = el.parentElement) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({ tag: el.tagName, b: Math.round(r.bottom), h: Math.round(r.height), pb: cs.paddingBottom, mb: cs.marginBottom, cls: (el.className?.toString?.() || "").slice(0, 44) });
  }
  return out;
});
for (const o of m) console.log(`${o.tag.padEnd(5)} bottom=${String(o.b).padStart(4)} h=${String(o.h).padStart(4)} pb=${o.pb.padEnd(6)} mb=${o.mb.padEnd(6)} ${o.cls}`);
await context.close();
