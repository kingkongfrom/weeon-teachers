import { chromium } from "playwright";
const context = await chromium.launchPersistentContext(".probe-profile", {
  headless: false,
  viewport: { width: 1400, height: 950 },
});
const page = context.pages()[0] ?? await context.newPage();
await page.goto("http://localhost:3001/", { waitUntil: "domcontentloaded" });
console.log("browser open at login. Waiting up to 4 minutes for a session cookie...");

let signedIn = false;
for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(2000);
  try {
    const cookies = await context.cookies("http://localhost:3001");
    const authish = cookies.filter((c) => /auth|session|sb-/i.test(c.name));
    if (authish.length > 0) {
      console.log(`SIGNED IN after ~${(i + 1) * 2}s — cookie(s): ${authish.map(c => c.name).join(", ")}`);
      signedIn = true;
      break;
    }
  } catch {
    console.log("browser closed before sign-in");
    process.exit(1);
  }
}

if (signedIn) {
  await page.goto("http://localhost:3001/comunicacion/mensajes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  console.log("messages page:", page.url());
  await page.screenshot({ path: "probe-phone-mensajes.png" });
  console.log("screenshot saved");
}
await context.close();
process.exit(signedIn ? 0 : 1);
