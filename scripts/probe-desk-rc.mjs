import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 260; });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
const before = await page.evaluate(() => ({
  hoverHover: matchMedia("(hover: hover)").matches,
  hoverNone: matchMedia("(hover: none)").matches,
  innerW: innerWidth,
}));
console.log("media at 1280:", JSON.stringify(before));
await page.mouse.click(b.x, b.y, { button: "right" });
await page.waitForTimeout(700);
const after = await page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  return { menus: m.length, label: m[0]?.getAttribute("aria-label"), text: m[0]?.textContent?.trim().slice(0,40) };
});
console.log("after right-click:", JSON.stringify(after));
await page.screenshot({ path: "probe-desktop-rc.png" });
await context.close();
