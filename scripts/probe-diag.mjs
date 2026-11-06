import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
await page.evaluate(() => { const w = document.querySelector(".chat-wallpaper"); if (w) w.scrollTop = w.scrollHeight; });
await page.waitForTimeout(500);

/* Does the bubble have React props at all? Are window listeners alive? */
const diag = await page.evaluate(() => {
  const b = document.querySelectorAll(".wa-bubble")[6];
  const keys = Object.keys(b || {});
  const reactKey = keys.find(k => k.startsWith("__reactProps"));
  const props = reactKey ? Object.keys(b[reactKey]) : [];
  return {
    hasReactProps: !!reactKey,
    eventProps: props.filter(p => p.startsWith("on")),
  };
});
console.log("bubble props:", JSON.stringify(diag));

/* Fire a move on window BEFORE any pointerdown: does our window listener see it? */
const heard = await page.evaluate(() => {
  window.__probeSaw = 0;
  const spy = () => { window.__probeSaw++; };
  window.addEventListener("pointermove", spy, true);
  window.dispatchEvent(new PointerEvent("pointermove", { bubbles:true, pointerId:1, pointerType:"touch", clientX:100, clientY:100 }));
  window.removeEventListener("pointermove", spy, true);
  return window.__probeSaw;
});
console.log("window pointermove dispatch works:", heard);

await context.close();
