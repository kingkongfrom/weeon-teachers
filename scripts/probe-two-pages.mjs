import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
for (const [name, url] of [["grupos", "http://localhost:3001/grupos"], ["aula", "http://localhost:3001/aula-virtual"]]) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `probe-${name}.png`, clip: { x: 0, y: 0, width: 1400, height: 620 } });
  const info = await page.evaluate(() => ({
    rows: document.querySelectorAll("li.group").length,
    cards: document.querySelectorAll("article.group").length,
  }));
  console.log(name, JSON.stringify(info));
}
await context.close();
