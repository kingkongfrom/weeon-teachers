import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const pane = document.querySelector(".comms-fill");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  const list = document.querySelector(".comms-fill [class*='overflow-y-auto']");
  const g = (el) => el ? { top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  return { vh: innerHeight, pane: g(pane), nav: g(nav), scroll: g(list), deadSpace: nav && pane ? Math.round(nav.getBoundingClientRect().top - pane.getBoundingClientRect().bottom) : null };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
