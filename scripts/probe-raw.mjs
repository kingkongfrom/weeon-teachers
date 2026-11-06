import { chromium, devices } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  ...devices["Pixel 5"], headless: true, hasTouch: true, isMobile: true,
});
const page = context.pages()[0] ?? await context.newPage();
const logs = [];
page.on("console", m => logs.push(`[${m.type()}] ${m.text().slice(0,200)}`));
page.on("pageerror", e => logs.push(`[pageerror] ${e.message.slice(0,300)}`));
await page.goto("http://localhost:3001/comunicacion/chat/e9a71935-7e2b-4228-8eae-ee9cf3f550f5", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(10000);

/* Is React actually interactive? Click the composer and see if focus lands. */
const hydrated = await page.evaluate(() => {
  const ta = document.querySelector("textarea");
  if (!ta) return "no textarea";
  ta.focus();
  return document.activeElement === ta ? "textarea focusable = hydrated" : "focus failed = NOT hydrated";
});
console.log("hydration check:", hydrated);

/* Raw listener at document level, before anything else. */
const raw = await page.evaluate(() => new Promise((resolve) => {
  const seen = [];
  const spy = (e) => seen.push({ t: e.type, pt: e.pointerType, id: e.pointerId, cls: (e.target.className||"").toString().slice(0,40) });
  for (const t of ["pointerdown","pointermove","pointerup"]) document.addEventListener(t, spy, true);
  const b = [...document.querySelectorAll(".wa-bubble")].find(el => { const r=el.getBoundingClientRect(); return r.y>100 && r.y<600; });
  if (!b) { resolve({ error: "no bubble" }); return; }
  const r = b.getBoundingClientRect();
  const x = r.x + r.width - 12, y = r.y + r.height/2;
  const el = document.elementFromPoint(x, y);
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles:true, cancelable:true, pointerId:9, pointerType:"touch", clientX:x, clientY:y, buttons:1 }));
  window.dispatchEvent(new PointerEvent("pointermove", { bubbles:true, cancelable:true, pointerId:9, pointerType:"touch", clientX:x-60, clientY:y, buttons:1 }));
  setTimeout(() => {
    for (const t of ["pointerdown","pointermove","pointerup"]) document.removeEventListener(t, spy, true);
    resolve({ seen, transform: getComputedStyle(b).transform, isHydratedMarker: !!document.querySelector("[data-nextjs-router]") });
  }, 200);
}));
console.log("\nraw document events:", JSON.stringify(raw, null, 2));
console.log("\n--- page errors ---");
logs.filter(l => l.includes("error") || l.includes("pageerror")).slice(-8).forEach(l => console.log("  " + l));
await context.close();
