/**
 * Open a real Chromium at a phone viewport with a PERSISTENT profile, so a human
 * can sign in once. The profile is reused by probe-swipe.mjs afterwards.
 *
 * Run:  node scripts/open-browser.mjs
 *
 * Then: sign in, open a chat with messages, and LEAVE THE WINDOW OPEN.
 * Press Ctrl+C here when done — the profile is already saved to disk.
 */
import { chromium, devices } from "playwright";

const BASE = process.env.WEON_BASE ?? "http://localhost:3001";
const PROFILE = ".probe-profile";

const context = await chromium.launchPersistentContext(PROFILE, {
  ...devices["Pixel 5"],
  headless: false,
  viewport: { width: 393, height: 851 },
  hasTouch: true,
  isMobile: true,
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(`${BASE}/comunicacion/chat`, { waitUntil: "domcontentloaded" });

console.log("A browser window is open at the phone viewport.");
console.log("1. Sign in.");
console.log("2. Open a chat that has messages.");
console.log("3. Leave the window open and tell me you are ready.");
console.log("The session is saved to .probe-profile for the next step.");

/* Keep the process alive until Ctrl+C, so the profile is not flushed mid-use. */
await new Promise(() => {});
