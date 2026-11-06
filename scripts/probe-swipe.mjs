/**
 * Reproduce the phone swipe-to-reply in the SIGNED-IN persistent profile.
 *
 * The owner reports the bubble slides but the reply never opens, while unit
 * tests pass. This drives the real page and reports what actually happened.
 *
 * Run:  node scripts/probe-swipe.mjs
 */
import { chromium, devices } from "playwright";

const BASE = process.env.WEON_BASE ?? "http://localhost:3001";
const PROFILE = ".probe-profile";

const context = await chromium.launchPersistentContext(PROFILE, {
  ...devices["Pixel 5"],
  headless: true,
  viewport: { width: 393, height: 851 },
  hasTouch: true,
  isMobile: true,
});

const page = context.pages()[0] ?? (await context.newPage());

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

/* Go straight to the chat list, then into the first thread. */
await page.goto(`${BASE}/comunicacion/chat`, { waitUntil: "networkidle" });
await page.waitForTimeout(9000);

if (page.url().includes("/login") || page.url().endsWith("/")) {
  console.log("STILL AT LOGIN — url:", page.url());
  await page.screenshot({ path: "probe-out-screen.png" });
  await context.close();
  process.exit(0);
}

/* Open the first conversation if we are on the list. */
const anyThreadLink = page.locator('a[href*="/comunicacion/chat/"]').first();
if ((await anyThreadLink.count()) > 0) {
  await anyThreadLink.click();
  await page.waitForTimeout(9000);
}

/* Instrument BEFORE touching anything. */
await page.evaluate(() => {
  window.__events = [];
  for (const t of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) {
    window.addEventListener(
      t,
      (e) => {
        window.__events.push({
          type: t,
          pointerType: e.pointerType,
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          prevented: e.defaultPrevented,
        });
      },
      true,
    );
  }
  /* Record when the composer strip (reply preview) appears. */
  window.__stripSeen = false;
});

const bubble = page.locator(".wa-bubble").first();
const bubbleCount = await bubble.count();
console.log("bubbles on page:", bubbleCount);

if (bubbleCount === 0) {
  console.log("NO BUBBLES — url:", page.url());
  await page.screenshot({ path: "probe-out-screen.png" });
  await context.close();
  process.exit(0);
}

const box = await bubble.boundingBox();
console.log("bubble box:", JSON.stringify(box));

const startX = Math.round(box.x + box.width - 10);
const startY = Math.round(box.y + box.height / 2);

/* A real touch sequence: down, a few moves leftward, up. */
await page.evaluate(
  ({ startX, startY }) => {
    const el = document.elementFromPoint(startX, startY);
    const mk = (type, x, y) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: x,
        clientY: y,
        buttons: type === "pointerup" ? 0 : 1,
      });
    el.dispatchEvent(mk("pointerdown", startX, startY));
    for (const dx of [6, 18, 34, 52, 74, 96]) {
      window.dispatchEvent(mk("pointermove", startX - dx, startY));
    }
    window.dispatchEvent(mk("pointerup", startX - 96, startY));
  },
  { startX, startY },
);

await page.waitForTimeout(600);

const events = await page.evaluate(() => window.__events);
const transform = await page.evaluate(() => {
  const el = document.querySelector(".wa-bubble");
  return el ? getComputedStyle(el).transform : "none";
});
const stripVisible = await page.evaluate(() => {
  /* The reply composer strip renders above the input when replyTo is set. */
  const text = document.body.innerText;
  return { hasReplyWord: /Responder|Replying/.test(text) };
});

console.log("\n--- pointer events ---");
for (const e of events) {
  console.log(`  ${e.type.padEnd(14)} ${String(e.pointerType).padEnd(6)} x=${e.x}`);
}

console.log("\ntransform after swipe:", transform);
console.log("reply strip text seen:", JSON.stringify(stripVisible));
console.log("\n--- console ---");
for (const l of logs.slice(-15)) console.log("  " + l);

await page.screenshot({ path: "probe-out-screen.png" });
console.log("\nscreenshot: probe-out-screen.png");

await context.close();

