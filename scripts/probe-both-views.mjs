import { chromium, devices } from "playwright";

async function check(label, opts, act) {
  const context = await chromium.launchPersistentContext(".probe-profile", { ...opts, headless: true });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const b = await page.evaluate(() => {
    for (const el of document.querySelectorAll(".wa-bubble")) {
      const r = el.getBoundingClientRect();
      const cy = r.y + r.height / 2;
      if (cy < 130 || cy > window.innerHeight - 220) continue;
      const top = document.elementFromPoint(r.x + r.width / 2, cy);
      if (top && (top === el || el.contains(top))) return { x: r.x + r.width / 2, y: cy };
    }
    return null;
  });
  if (!b) { console.log(label, "-> no bubble"); await context.close(); return; }
  const res = await act(page, context, b);
  console.log(label, "->", JSON.stringify(res));
  await context.close();
}

const read = (page) => page.evaluate(() => {
  const m = [...document.querySelectorAll("[role=menu]")];
  const t = m[0]?.textContent || "";
  return {
    menus: m.length,
    emojiRow: ["👍","❤️","😂","😮","😢","🙏"].every(e => t.includes(e)),
    replyMenu: /Responder|Reply/.test(t),
  };
});

/* DESKTOP: right click */
await check("DESKTOP right-click", { viewport: { width: 1280, height: 900 } }, async (page, ctx, b) => {
  await page.mouse.click(b.x, b.y, { button: "right" });
  await page.waitForTimeout(600);
  return read(page);
});

/* PHONE: long press */
await check("PHONE long-press", { ...devices["Pixel 5"], hasTouch: true, isMobile: true }, async (page, ctx, b) => {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
  await page.waitForTimeout(120);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 6, y: b.y + 2 }] });
  await page.waitForTimeout(700);
  return read(page);
});
