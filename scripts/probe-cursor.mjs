import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
for (const [n, u] of [["grupos","http://localhost:3001/grupos"],["aula","http://localhost:3001/aula-virtual"]]) {
  await page.goto(u, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(8000);
  const r = await page.evaluate(() => {
    const card = document.querySelector("li, article");
    if (!card) return null;
    const b = card.getBoundingClientRect();
    const el = document.elementFromPoint(b.x + b.width * 0.5, b.y + b.height * 0.6);
    const host = el?.closest("article, li");
    return { cursor: host ? getComputedStyle(host).cursor : null, inLink: !!el?.closest("a") };
  });
  console.log(n, "->", JSON.stringify(r));
}
await context.close();
