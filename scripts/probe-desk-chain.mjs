import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1560, height: 846 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  /* Walk from the list pane upward, recording bottom edges. */
  const pane = document.querySelector(".comms-fill");
  const out = [];
  for (let el = pane; el && el !== document.documentElement; el = el.parentElement) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({ tag: el.tagName, b: Math.round(r.bottom), h: Math.round(r.height), pb: cs.paddingBottom, mb: cs.marginBottom });
  }
  return out;
});
for (const o of m) console.log(`${o.tag} bottom=${o.b} h=${o.h} pb=${o.pb} mb=${o.mb}`);
await context.close();
