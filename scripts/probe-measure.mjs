import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true, colorScheme: "dark",
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);

const m = await page.evaluate(() => {
  const composerBar = document.querySelector("textarea")?.closest("div")?.parentElement?.parentElement;
  const nav = document.querySelector("nav");
  const pane = document.querySelector(".comms-fill");
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
  const cs = getComputedStyle(document.documentElement);
  return {
    viewportH: window.innerHeight,
    pane: r(pane),
    composerBar: r(composerBar),
    nav: r(nav),
    gapComposerToNav: composerBar && nav ? Math.round(nav.getBoundingClientRect().top - composerBar.getBoundingClientRect().bottom) : null,
    tokens: {
      navHeight: cs.getPropertyValue("--phone-nav-height").trim(),
      nudge: cs.getPropertyValue("--phone-pane-nudge").trim(),
    },
    paneHeightStyle: pane ? getComputedStyle(pane).height : null,
  };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
