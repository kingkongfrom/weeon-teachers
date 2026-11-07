import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
/* Force the skeleton by blocking the slow data: navigate and sample before hydration completes. */
for (const [name, url] of [["aula-virtual","http://localhost:3001/aula-virtual"],["grupos","http://localhost:3001/grupos"]]) {
  await page.goto(url, { waitUntil: "commit" });
  await page.waitForTimeout(250);
  const h = await page.evaluate(() => {
    const el = document.querySelector("main > div > div");
    return el ? Math.round(el.getBoundingClientRect().height) : null;
  });
  console.log(name, "skeleton-ish height:", h);
}
await context.close();
