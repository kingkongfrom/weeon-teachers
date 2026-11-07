import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const sec = document.querySelector(".comms-fill section");
  const sc = sec?.querySelector(":scope > div");
  const ul = sec?.querySelector("ul");
  const lis = ul ? [...ul.children] : [];
  const g = (el) => el ? { top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
  const cs = sc ? getComputedStyle(sc) : null;
  return {
    section: g(sec), scroller: g(sc), ul: g(ul),
    liCount: lis.length,
    lastLi: g(lis[lis.length - 1]),
    scrollerScrollH: sc?.scrollHeight, scrollerClientH: sc?.clientHeight,
    scrollerDisplay: cs?.display, scrollerFlex: cs?.flex,
    ulHeightStyle: ul ? getComputedStyle(ul).height : null,
  };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
