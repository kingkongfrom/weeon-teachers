import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility smoke for teacher web (docs/testing.md §4.6, §7 — QA-7).
// Fails on serious/critical axe violations on the public login route and, when
// credentials are configured, the landing + gradebook.

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;
const CLASS_ID = process.env.E2E_CLASS_ID;
const hasCreds = Boolean(TEACHER_USER && TEACHER_PASSWORD);

async function analyze(page: import("@playwright/test").Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await page.waitForLoadState("load").catch(() => {});
  await page
    .evaluate(() => (document.fonts ? document.fonts.ready.then(() => undefined) : undefined))
    .catch(() => {});
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((n) => n.target),
    }));
}

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
  await page
    .getByRole("button", { name: /continuar|siguiente/i })
    .click();
  await page.locator('input[type="password"]').first().fill(TEACHER_PASSWORD!);
  await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
  await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });
}

test("no serious/critical a11y violations on / (login)", async ({ page }) => {
  const summary = await analyze(page, "/");
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
});

test.describe("authenticated", () => {
  test.skip(!hasCreds, "E2E_TEACHER_USERNAME / E2E_TEACHER_PASSWORD not configured");

  test("no serious/critical a11y violations on /inicio", async ({ page }) => {
    await signIn(page);
    const summary = await analyze(page, "/inicio");
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });

  test("no serious/critical a11y violations on a gradebook", async ({ page }) => {
    test.skip(!CLASS_ID, "E2E_CLASS_ID not configured");
    await signIn(page);
    const summary = await analyze(page, `/grupos/${CLASS_ID}`);
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });
});
