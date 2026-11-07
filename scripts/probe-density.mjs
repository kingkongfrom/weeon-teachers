import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("li")].filter(e => e.querySelector("[role=button]"));
  const heights = rows.slice(0, 6).map(r => Math.round(r.getBoundingClientRect().height));
  const sc = document.querySelector(".comms-fill section > div");
  return { rowHeights: heights, avg: Math.round(heights.reduce((a,b)=>a+b,0)/Math.max(1,heights.length)), scrollH: sc?.scrollHeight, clientH: sc?.clientHeight, visible: Math.round((sc?.clientHeight ?? 0) / Math.max(1, heights[0] || 1)) };
});
console.log(JSON.stringify(m));
await page.screenshot({ path: "probe-phone-mensajes.png" });
await context.close();
