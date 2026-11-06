import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0,200)));
page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0,200)); });
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);
const state = await page.evaluate(() => ({
  url: location.pathname,
  bubbles: document.querySelectorAll(".wa-bubble").length,
  textarea: !!document.querySelector("textarea"),
  bodyStart: document.body.innerText.slice(0, 100).replace(/\n/g, " | "),
}));
console.log("PAGE:", JSON.stringify(state));
console.log("ERRORS:", errs.length ? JSON.stringify(errs.slice(0,4)) : "none");
await page.screenshot({ path: "probe-current.png" });
await context.close();
