import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true, colorScheme: "dark",
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);

const m = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  /* The composer bar is the ancestor that carries the border-top and composer bg. */
  let bar = null;
  for (let n = ta; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.borderTopWidth !== "0px" && cs.borderTopWidth !== "") { bar = n; break; }
  }
  const navEl = [...document.querySelectorAll("nav,footer")].find(e => e.getBoundingClientRect().height > 40);
  const rect = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height) }; };
  return {
    viewportH: window.innerHeight,
    composerBar: rect(bar),
    composerBarClasses: bar?.className?.toString().slice(0, 90),
    nav: rect(navEl),
    navClasses: navEl?.className?.toString().slice(0, 90),
    gap: bar && navEl ? Math.round(navEl.getBoundingClientRect().top - bar.getBoundingClientRect().bottom) : null,
  };
});
console.log(JSON.stringify(m, null, 2));
await page.screenshot({ path: "probe-gap.png" });
await context.close();
