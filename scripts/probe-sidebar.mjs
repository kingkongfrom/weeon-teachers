import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/mis-evaluaciones", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const nav = await page.evaluate(() => {
  const links = [...document.querySelectorAll("nav a")].map(a => ({
    text: a.textContent.trim(),
    href: a.getAttribute("href"),
    current: a.getAttribute("aria-current"),
    indent: a.className.includes("ml-4"),
  }));
  return links.filter(l => l.text.includes("evaluacion") || l.text.includes("Aula"));
});
console.log(JSON.stringify(nav, null, 2));
await page.screenshot({ path: "probe-sidebar.png", clip: { x: 0, y: 120, width: 300, height: 480 } });
await context.close();
