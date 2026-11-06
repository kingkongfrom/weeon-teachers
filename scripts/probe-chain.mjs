import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const out = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const pane = document.querySelector(".comms-fill");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 40);
  const cs = getComputedStyle(document.documentElement);
  const chain = [];
  for (let n = ta; n && n !== document.body; n = n.parentElement) {
    const r = n.getBoundingClientRect();
    chain.push({ tag: n.tagName, cls: (n.className?.toString?.() || "").slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) });
    if (chain.length > 5) break;
  }
  return {
    innerH: innerHeight,
    nudge: cs.getPropertyValue("--phone-pane-nudge").trim(),
    paneBottom: pane ? Math.round(pane.getBoundingClientRect().bottom) : null,
    navTop: Math.round(nav.getBoundingClientRect().top),
    chain,
  };
});
console.log(JSON.stringify(out, null, 2));
await context.close();
