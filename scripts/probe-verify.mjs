import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);

const target = await page.evaluate(() => {
  for (const b of document.querySelectorAll(".wa-bubble")) {
    const r = b.getBoundingClientRect();
    const cx = r.x + r.width - 12, cy = r.y + r.height/2;
    if (cy < 90 || cy > 680) continue;
    const top = document.elementFromPoint(cx, cy);
    if (top && (top === b || b.contains(top))) return { x: cx, y: cy, w: r.width, h: r.height };
  }
  return null;
});
console.log("target bubble:", JSON.stringify(target));
if (!target) { await context.close(); process.exit(0); }

const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: target.x, y: target.y }] });
await page.waitForTimeout(60);

/* Track the bubble's transform as the finger moves. */
const samples = [];
for (const dx of [20, 50, 90, 140]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: target.x - dx, y: target.y }] });
  await page.waitForTimeout(70);
  const t = await page.evaluate(() => {
    const el = document.querySelector(".wa-bubble");
    return el ? getComputedStyle(el).transform : "none";
  });
  samples.push({ dx, transform: t });
}
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(800);

console.log("\n--- bubble transform as finger moves ---");
samples.forEach(s => console.log(`  dx=${String(s.dx).padEnd(4)} transform=${s.transform}`));

const result = await page.evaluate(() => ({
  replyComposer: !!document.querySelector("textarea"),
  replyMenuOpen: /Responder/.test(document.body.innerText),
  svgIcons: document.querySelectorAll("[role=menu]").length,
}));
console.log("\nreply menu present:", result.replyMenuOpen, "| role=menu:", result.svgIcons);
await page.screenshot({ path: "probe-result.png" });
await context.close();
