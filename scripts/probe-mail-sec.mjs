import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const m = await page.evaluate(() => {
  const sec = document.querySelector(".comms-fill section");
  if (!sec) return { err: "no section" };
  const sr = sec.getBoundingClientRect();
  const kids = [...sec.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), of: getComputedStyle(el).overflowY, cls: (el.className?.toString?.() || "").slice(0, 40) };
  });
  /* The scrollable list inside the section. */
  const scrollers = [...sec.querySelectorAll("*")].filter((e) => getComputedStyle(e).overflowY === "auto").map((e) => {
    const r = e.getBoundingClientRect();
    return { h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), scrollH: e.scrollHeight, clientH: e.clientHeight };
  });
  return { section: { top: Math.round(sr.top), bottom: Math.round(sr.bottom), h: Math.round(sr.height) }, kids, scrollers };
});
console.log(JSON.stringify(m, null, 2));
await context.close();
