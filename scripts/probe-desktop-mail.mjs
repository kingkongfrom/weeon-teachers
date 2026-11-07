import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1560, height: 846 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const pane = document.querySelector(".comms-fill");
  const g = (el) => el ? { t: Math.round(el.getBoundingClientRect().top), b: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  const cs = pane ? getComputedStyle(pane) : null;
  return { vh: innerHeight, pane: g(pane), paneH: cs?.height, paneMt: cs?.marginTop, paneMb: cs?.marginBottom, main: g(document.querySelector("main")), body: g(document.body) };
});
console.log(JSON.stringify(m, null, 1));
await page.screenshot({ path: "probe-desktop-mail.png" });
await context.close();
