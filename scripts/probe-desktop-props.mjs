import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
const logs = [];
page.on("console", m => logs.push(m.text().slice(0,120)));
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);
const info = await page.evaluate(() => {
  const bubbles = [...document.querySelectorAll(".wa-bubble")];
  const el = bubbles.find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 200; });
  if (!el) return { err: "no bubble", count: bubbles.length };
  const k = Object.keys(el).find(x => x.startsWith("__reactProps"));
  const r = el.getBoundingClientRect();
  return {
    props: k ? Object.keys(el[k]).filter(p => p.startsWith("on")) : [],
    box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    innerW: innerWidth,
  };
});
console.log("bubble:", JSON.stringify(info));
await context.close();
