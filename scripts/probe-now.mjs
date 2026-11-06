import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
console.log(JSON.stringify(await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 40);
  const b = ta.getBoundingClientRect(), n = nav.getBoundingClientRect();
  return { innerH: innerHeight, taBottom: Math.round(b.bottom), taTop: Math.round(b.top), navTop: Math.round(n.top), navBottom: Math.round(n.bottom), overlap: Math.round(b.bottom - n.top) };
})));
await context.close();
