import { chromium, devices } from "playwright";
const read = (page) => page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  const t = m[0]?.textContent || "";
  const ta = document.querySelector("textarea");
  return {
    menus: m.length,
    popoverReply: /Responder/.test(t),
    quoteStrip: /Rodrigo/.test(document.body.innerText.slice(-400)),
    caret: document.activeElement?.tagName,
  };
});
for (const [label, opts, act] of [
  ["DESKTOP", { viewport: { width: 1280, height: 900 } }, async (page, ctx, b) => { await page.mouse.click(b.x, b.y, { button: "right" }); await page.waitForTimeout(700); }],
  ["PHONE", { ...devices["Pixel 5"], hasTouch: true, isMobile: true }, async (page, ctx, b) => {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
    await page.waitForTimeout(120);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 6, y: b.y + 2 }] });
    await page.waitForTimeout(700);
  }],
]) {
  const context = await chromium.launchPersistentContext(".probe-profile", { ...opts, headless: true });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const b = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".wa-bubble")].find(x => { const r = x.getBoundingClientRect(); return r.y > 130 && r.y < innerHeight - 220; });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + 16 };
  });
  if (!b) { console.log(label, "no bubble"); await context.close(); continue; }
  await act(page, context, b);
  console.log(label, "->", JSON.stringify(await read(page)));
  await context.close();
}
