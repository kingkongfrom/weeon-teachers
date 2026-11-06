import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const info = await page.evaluate(() => {
  const out = { url: location.pathname, waBubble: document.querySelectorAll(".wa-bubble").length, waChat: document.querySelectorAll(".wa-chat").length, composer: document.querySelectorAll("textarea").length };
  const first = document.querySelector(".wa-bubble");
  if (first) {
    let p = first, chain = [];
    for (let i = 0; i < 5 && p; i++) { chain.push(p.className.toString().slice(0,60)); p = p.parentElement; }
    out.chain = chain;
  }
  out.wallpaper = document.querySelectorAll(".chat-wallpaper").length;
  return out;
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "probe-thread.png", fullPage: false });
await context.close();
