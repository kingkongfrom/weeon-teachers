import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  /* What is painted at these Y positions, in the middle of the screen? */
  const x = Math.round(innerWidth / 2);
  const samples = [];
  for (let y = 560; y <= 700; y += 10) {
    const el = document.elementFromPoint(x, y);
    const bg = el ? getComputedStyle(el).backgroundColor : null;
    samples.push({ y, tag: el?.tagName, bg, cls: (el?.className?.toString?.() || "").slice(0, 34) });
  }
  const nav = [...document.querySelectorAll("nav")].find(e => e.getBoundingClientRect().height > 30);
  const sec = document.querySelector(".comms-fill section");
  const sc = document.querySelector(".comms-fill section > div");
  const g = (el) => el ? { top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom) } : null;
  return { section: g(sec), scroller: g(sc), navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null, samples };
});
console.log("section:", JSON.stringify(m.section), "scroller:", JSON.stringify(m.scroller), "navTop:", m.navTop);
for (const s of m.samples) console.log(`  y=${s.y} ${s.tag} bg=${s.bg} ${s.cls}`);
await context.close();
