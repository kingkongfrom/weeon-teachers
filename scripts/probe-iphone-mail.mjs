import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["iPhone 13"], headless: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const pane = document.querySelector(".comms-fill");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  const sc = pane?.querySelector("section > div");
  const g = (el) => el ? { t: Math.round(el.getBoundingClientRect().top), b: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  const cs = pane ? getComputedStyle(pane) : null;
  return { vh: innerHeight, pane: g(pane), nav: g(nav), scroller: g(sc), paneH: cs?.height, paneMb: cs?.marginBottom, paneMt: cs?.marginTop, scrollH: sc?.scrollHeight, clientH: sc?.clientHeight };
});
console.log(JSON.stringify(m, null, 1));
await page.screenshot({ path: "probe-iphone-mail.png" });
await context.close();
