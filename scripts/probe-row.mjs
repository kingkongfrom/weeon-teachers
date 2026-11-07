import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("[data-message-row], li, article")].filter(e => e.textContent?.includes("Eduardo"));
  const row = rows[0];
  if (!row) return { err: "no row" };
  const r = row.getBoundingClientRect();
  const kids = [...row.querySelectorAll("*")].slice(0, 22).map(e => {
    const b = e.getBoundingClientRect();
    return { tag: e.tagName, text: (e.textContent || "").trim().slice(0, 22), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), cls: (e.className?.toString?.() || "").slice(0, 34) };
  });
  return { rowH: Math.round(r.height), rowCls: (row.className?.toString?.() || "").slice(0,60), kids: kids.filter(k => k.h > 4) };
});
console.log(JSON.stringify(m, null, 1).slice(0, 3000));
await context.close();
