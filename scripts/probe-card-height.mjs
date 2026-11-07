import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const card = document.querySelector("article");
  if (!card) return { err: "no card" };
  const kids = [...card.children].map(el => ({ h: Math.round(el.getBoundingClientRect().height), cls: (el.className||"").slice(0,40) }));
  return { cardH: Math.round(card.getBoundingClientRect().height), kids, vh: innerHeight };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
