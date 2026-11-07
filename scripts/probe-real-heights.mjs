import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
/* Measure the REAL card height on each screen, for comparison with its skeleton. */
const targets = [
  ["aula-virtual", "http://localhost:3001/aula-virtual", "article"],
  ["grupos", "http://localhost:3001/grupos", "li > div"],
];
for (const [name, url, sel] of targets) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  const h = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? Math.round(el.getBoundingClientRect().height) : null;
  }, sel);
  console.log(name, "real height:", h);
}
await context.close();
