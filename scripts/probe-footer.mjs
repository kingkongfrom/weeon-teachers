import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.setViewportSize({ width: 393, height: 851 });
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const m = await page.evaluate(() => {
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 40);
  const link = nav?.querySelector("a");
  const span = link?.querySelector("span");
  const label = span?.nextElementSibling;
  const cs = (el) => el ? getComputedStyle(el) : null;
  const r = (el) => el ? Math.round(el.getBoundingClientRect().height) : null;
  return {
    navH: r(nav),
    navPadTop: cs(nav)?.paddingTop, navPadBottom: cs(nav)?.paddingBottom,
    linkH: r(link), linkPadTop: cs(link)?.paddingTop, linkPadBottom: cs(link)?.paddingBottom,
    iconWellH: r(span), iconWellClasses: span?.className?.toString().slice(0,70),
    labelH: r(label), labelLineHeight: cs(label)?.lineHeight,
    navMinH: cs(nav)?.minHeight,
  };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
