import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["iPhone 13"], headless: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/mis-evaluaciones", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const cards = document.querySelectorAll("li");
  const last = cards[cards.length - 1];
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  return {
    vw: innerWidth,
    lastItemBottom: last ? Math.round(last.getBoundingClientRect().bottom) : null,
    navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
  };
});
console.log(JSON.stringify(m));
await page.screenshot({ path: "probe-iphone.png", fullPage: false });
await context.close();
