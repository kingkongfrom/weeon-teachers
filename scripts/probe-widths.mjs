import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true });
const page = context.pages()[0] ?? await context.newPage();
for (const [w, h] of [[1560, 846], [1440, 760], [1280, 620], [1024, 700]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  const m = await page.evaluate(() => {
    const pane = document.querySelector(".comms-fill");
    const sec = pane?.querySelector("section");
    const g = (el) => el ? { b: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
    return { vh: innerHeight, pane: g(pane), section: g(sec), scrollH: document.documentElement.scrollHeight };
  });
  console.log(`${w}x${h}  vh=${m.vh} paneBottom=${m.pane?.b} paneH=${m.pane?.h} sectionBottom=${m.section?.b} docScroll=${m.scrollH}`);
}
await context.close();
