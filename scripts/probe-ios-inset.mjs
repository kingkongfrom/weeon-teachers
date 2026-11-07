import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["iPhone 13"], headless: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const pane = document.querySelector(".comms-fill");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  const sc = document.querySelector(".comms-fill section > div");
  const g = (el) => el ? { top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);width:1px";
  document.body.appendChild(probe);
  const inset = Math.round(probe.getBoundingClientRect().height);
  probe.remove();
  return { vh: innerHeight, safeAreaBottom: inset, pane: g(pane), nav: g(nav), scroller: g(sc), gap: nav && pane ? Math.round(nav.getBoundingClientRect().top - pane.getBoundingClientRect().bottom) : null };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
