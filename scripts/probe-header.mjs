import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const before = await page.evaluate(() => {
  const row = document.querySelector(".wa-chat > div");
  const r = row.getBoundingClientRect();
  return { top: Math.round(r.top), h: Math.round(r.height) };
});
const sc = await page.evaluate(() => {
  const el = document.querySelector(".chat-wallpaper");
  el.scrollTop = 400;
  return el.scrollTop;
});
await page.waitForTimeout(400);
const after = await page.evaluate(() => {
  const row = document.querySelector(".wa-chat > div");
  const r = row.getBoundingClientRect();
  return { top: Math.round(r.top), h: Math.round(r.height) };
});
console.log("header before scroll:", JSON.stringify(before));
console.log("scrolled transcript to:", sc);
console.log("header after  scroll:", JSON.stringify(after));
await page.screenshot({ path: "probe-header.png" });
await context.close();
