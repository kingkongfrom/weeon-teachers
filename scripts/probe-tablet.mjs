import { chromium, devices } from "playwright";
for (const [label, dev] of [["iPad", devices["iPad (gen 7)"]], ["Phone", devices["Pixel 5"]]]) {
  const context = await chromium.launchPersistentContext(".probe-profile", { ...dev, headless: true, hasTouch: true, isMobile: true });
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  const b = await page.evaluate(() => {
    for (const el of document.querySelectorAll(".wa-bubble")) {
      const r = el.getBoundingClientRect();
      const cy = r.y + r.height / 2;
      if (cy < 120 || cy > window.innerHeight - 160) continue;
      const top = document.elementFromPoint(r.x + r.width - 30, cy);
      if (top && (top === el || el.contains(top))) return { x: r.x + r.width - 30, y: cy };
    }
    return null;
  });
  if (!b) { console.log(label, "-> no bubble"); await context.close(); continue; }
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
  await page.waitForTimeout(120);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - 7, y: b.y + 2 }] });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const m = [...document.querySelectorAll("[role=menu]")];
    const t = m[0]?.textContent || "";
    return { menus: m.length, emojiRow: ["👍","❤️","😂","😮","😢","🙏"].every(e => t.includes(e)) };
  });
  console.log(label, "->", JSON.stringify(r));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await context.close();
}
