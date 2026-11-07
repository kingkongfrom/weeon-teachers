import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/blooket", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(800);
const m = await page.evaluate(() => {
  const paras = [...document.querySelectorAll("p")];
  const last = paras.find(e => /Descargue el CSV y súbalo/.test(e.textContent || ""));
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  const r = last?.getBoundingClientRect();
  return {
    lines: last ? Math.round(r.height / 18) : null,
    pBottom: r ? Math.round(r.bottom) : null,
    pb: last ? getComputedStyle(last).paddingBottom : null,
    navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
    gapToNav: last && nav ? Math.round(nav.getBoundingClientRect().top - r.bottom) : null,
  };
});
console.log(JSON.stringify(m, null, 2));
await page.screenshot({ path: "probe-blooket-bottom.png" });
await context.close();
