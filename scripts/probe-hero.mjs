import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", { headless: true, viewport: { width: 1400, height: 1000 } });
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/aula-virtual/mis-evaluaciones", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const info = await page.evaluate(() => {
  const sec = document.querySelector("section");
  if (!sec) return { err: "no section" };
  const overlay = sec.querySelector("[aria-hidden]");
  const cs = overlay ? getComputedStyle(overlay) : null;
  return {
    text: sec.innerText.slice(0, 120).replace(/\n/g, " | "),
    overlayBg: cs?.backgroundImage?.slice(0, 80) ?? "none",
    overlayOpacity: cs?.opacity,
    overlayClass: overlay?.className?.slice(0, 100),
    varStart: getComputedStyle(document.documentElement).getPropertyValue("--brand-start").trim(),
  };
});
console.log(JSON.stringify(info, null, 2));
await context.close();
