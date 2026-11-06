import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1280, height: 900 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const b = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 300; });
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + 16 };
});
await page.mouse.click(b.x, b.y, { button: "right" });
await page.waitForTimeout(500);
const btn = await page.evaluate(() => {
  const m = document.querySelector("[role=menu]");
  const el = [...(m?.querySelectorAll("button") || [])].find(x => /Responder/.test(x.textContent || ""));
  const r = el?.getBoundingClientRect();
  return r ? { x: r.x + r.width/2, y: r.y + r.height/2 } : null;
});
await page.mouse.click(btn.x, btn.y);
await page.waitForTimeout(400);
const strip = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  return (ta?.closest("div")?.parentElement?.parentElement?.innerText || "").slice(0,80).replace(/\n/g," | ");
});
console.log("strip after Responder:", JSON.stringify(strip));
/* type and send */
await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(ta, "probe-reply-test");
  ta.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(300);
await page.keyboard.press("Enter");
await page.waitForTimeout(2500);
const result = await page.evaluate(() => {
  const bubbles = [...document.querySelectorAll(".wa-bubble")];
  const last = bubbles[bubbles.length - 1];
  return { text: last?.innerText.replace(/\n/g, " | ").slice(0, 120) };
});
console.log("sent bubble:", JSON.stringify(result));
await context.close();
