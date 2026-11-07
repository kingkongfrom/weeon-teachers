import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const sec = document.querySelector(".comms-fill section");
  const sc = sec?.querySelector(":scope > div");
  const ul = sec?.querySelector("ul");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  const g = (el) => el ? { t: Math.round(el.getBoundingClientRect().top), b: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  /* Sample the vertical strip between the last row and the nav. */
  const x = Math.round(innerWidth / 2);
  const rows = ul ? [...ul.children] : [];
  const lastRow = rows[rows.length - 1];
  const strip = [];
  if (lastRow) {
    const lb = Math.round(lastRow.getBoundingClientRect().bottom);
    const nb = nav ? Math.round(nav.getBoundingClientRect().top) : 0;
    for (let y = lb; y <= nb; y += Math.max(1, Math.round((nb - lb) / 4))) {
      const el = document.elementFromPoint(x, y);
      strip.push({ y, tag: el?.tagName, cls: (el?.className?.toString?.() || "").slice(0, 30) });
    }
  }
  return { scroller: g(sc), ul: g(ul), rowCount: rows.length, lastRow: g(lastRow), nav: g(nav), strip };
});
console.log(JSON.stringify(m, null, 1));
await context.close();
