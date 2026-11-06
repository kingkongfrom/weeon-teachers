import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const out = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const block = ta.closest("div").parentElement;
  const col = document.querySelector(".wa-chat.flex.h-full");
  const pane = document.querySelector(".comms-fill");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 40);
  const g = (el) => el ? { t: Math.round(el.getBoundingClientRect().top), b: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  return { innerH: innerHeight, pane: g(pane), col: g(col), composerBlock: g(block), nav: g(nav) };
});
console.log(JSON.stringify(out, null, 2));
await page.screenshot({ path: "probe-fixed.png" });
await context.close();
