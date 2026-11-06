import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);
const find = () => page.evaluate(() => {
  for (const el of document.querySelectorAll(".wa-bubble")) {
    const r = el.getBoundingClientRect();
    if (r.y > 120 && r.y < 520) return { x: r.x + r.width - 30, y: r.y + r.height/2 };
  }
  return null;
});
const menusOf = () => page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  const txt = m[0]?.textContent || "";
  return {
    count: m.length,
    isEmojiRow: ["👍","❤️","😂","😮","😢","🙏"].every(e => txt.includes(e)),
    isReplyMenu: /Responder/.test(txt),
    quoteStrip: /Prof, a que hora|Recuerda traer|examen inicia/.test(document.body.innerText) && !!document.activeElement?.closest?.("div")?.querySelector?.("textarea"),
  };
});
const cdp = await context.newCDPSession(page);

/* ---- TEST A: LONG PRESS -> reaction row ---- */
let b = await find();
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(150);
await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 8, y: b.y + 2 }] });
await page.waitForTimeout(700);
console.log("A) LONG PRESS  ->", JSON.stringify(await menusOf()));
await page.screenshot({ path: "probe-longpress.png" });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(700);

/* ---- TEST B: SWIPE -> direct reply, no menu ---- */
b = await find();
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(40);
for (const dx of [12, 30, 55, 85]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - dx, y: b.y }] });
  await page.waitForTimeout(40);
}
await page.waitForTimeout(400);
console.log("B) SWIPE       ->", JSON.stringify(await menusOf()));
await page.screenshot({ path: "probe-swipe-final.png" });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await context.close();
