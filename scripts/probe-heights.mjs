import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, hasTouch: true, isMobile: true, colorScheme: "dark" });
const page = context.pages()[0] ?? await context.newPage();

for (const [w, h] of [[393,851],[393,727],[390,600],[390,500],[360,800],[430,700],[1280,900]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const ta = document.querySelector("textarea");
    let bar = null;
    for (let n = ta; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.borderTopWidth !== "0px" && cs.borderTopWidth !== "") { bar = n; break; }
    }
    const navEl = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 40);
    if (!bar) return null;
    const bb = bar.getBoundingClientRect();
    const nb = navEl?.getBoundingClientRect();
    return { gap: nb ? Math.round(nb.top - bb.bottom) : "no nav", navH: nb ? Math.round(nb.height) : 0, vh: window.innerHeight };
  });
  console.log(`${w}x${h} ->`, JSON.stringify(m));
}
await context.close();
