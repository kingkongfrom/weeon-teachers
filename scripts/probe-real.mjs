import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);

const b = await page.evaluate(() => {
  for (const el of document.querySelectorAll(".wa-bubble")) {
    const r = el.getBoundingClientRect();
    if (r.y > 110 && r.y < 600) return { x: r.x + r.width - 12, y: r.y + r.height / 2 };
  }
  return null;
});
console.log("target:", JSON.stringify(b));

/* REAL touch through CDP — not dispatchEvent. This is what a finger does. */
const cdp = await context.newCDPSession(page);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: b.x, y: b.y }] });
await page.waitForTimeout(60);
const samples = [];
for (const dx of [20, 50, 90, 140]) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x - dx, y: b.y }] });
  await page.waitForTimeout(80);
  const t = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".wa-bubble")].find(e => e.style.transform);
    return el ? el.style.transform : "none";
  });
  samples.push({ dx, transform: t });
}
await page.screenshot({ path: "probe-mid-swipe.png" });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await page.waitForTimeout(700);

console.log("\n--- transform as a REAL finger moves ---");
samples.forEach(s => console.log(`  dx=${String(s.dx).padEnd(4)} ${s.transform}`));
const menu = await page.evaluate(() => ({
  responderWord: /Responder/.test(document.body.innerText),
  menuEls: document.querySelectorAll("[role=menu]").length,
}));
console.log("\nreply menu open:", menu.responderWord, "| role=menu count:", menu.menuEls);
await page.screenshot({ path: "probe-after-swipe.png" });
await context.close();
