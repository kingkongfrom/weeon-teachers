import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const card = document.querySelector("article");
  const body = card.children[1];
  const inner = body.children[0];
  return {
    bodyH: Math.round(body.getBoundingClientRect().height),
    innerH: Math.round(inner.getBoundingClientRect().height),
    innerKids: [...inner.children].map(c => ({ h: Math.round(c.getBoundingClientRect().height), cls: (c.className||"").slice(0,30) })),
  };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
