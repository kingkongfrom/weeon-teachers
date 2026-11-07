import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
/* Filter to a rare term so only one or two messages remain — the owner's case. */
await page.fill("input[placeholder*='Buscar']", "Carolina");
await page.waitForTimeout(1500);
const m = await page.evaluate(() => {
  const sec = document.querySelector(".comms-fill section");
  const sc = sec?.querySelector(":scope > div");
  const ul = sec?.querySelector("ul");
  const g = (el) => el ? { top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  return { scroller: g(sc), ul: g(ul), rows: ul ? ul.children.length : 0, bg: sc ? getComputedStyle(sc).backgroundColor : null, ulBg: ul ? getComputedStyle(ul).backgroundColor : null };
});
console.log(JSON.stringify(m));
await page.screenshot({ path: "probe-filtered.png" });
await context.close();
