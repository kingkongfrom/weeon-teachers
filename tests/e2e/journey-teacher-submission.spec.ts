import { test, expect } from "@playwright/test";

// Journey 5 (docs/testing.md §7 — QA-6): the teacher opens a student's turn-in
// and sees what the student submitted — including photos — plus a place to mark
// it. This is the journey that caught the 20 Oct regressions by hand; it must
// run automatically on every preview.
//
// Requires: E2E_TEACHER_USERNAME / E2E_TEACHER_PASSWORD, E2E_CLASS_ID and
// E2E_ASSESSMENT_ID (a published assignment in that group with at least one
// submission). Skips itself when they are not configured.

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;
const CLASS_ID = process.env.E2E_CLASS_ID;
const ASSESSMENT_ID = process.env.E2E_ASSESSMENT_ID;
const hasCreds = Boolean(TEACHER_USER && TEACHER_PASSWORD && CLASS_ID && ASSESSMENT_ID);

test.describe("Teacher reviews a turn-in", () => {
  test.skip(!hasCreds, "E2E_* teacher credentials / group / assessment not configured");

  test("opens the assessment, lists submissions and opens the grader", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
    await page.getByRole("button", { name: /continuar|siguiente|entrar|ingresar/i }).click();
    await page.getByLabel(/contraseña|password/i).fill(TEACHER_PASSWORD!);
    await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
    await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });

    await page.goto(`/aula-virtual/${CLASS_ID}/evaluaciones/${ASSESSMENT_ID}`);
    await expect(page).toHaveURL(new RegExp(`/evaluaciones/${ASSESSMENT_ID}`));

    // The submissions list must offer at least one turn-in to open.
    const firstTurnIn = page.locator(`a[href*="/entregas/"]`).first();
    await expect(firstTurnIn).toBeVisible({ timeout: 20000 });

    await firstTurnIn.click();
    await expect(page).toHaveURL(/\/entregas\/[0-9a-f-]+$/);

    // The grader itself renders: total mark control or the direct-mark inputs.
    const graderReady = page
      .getByRole("button", { name: /guardar y devolver|save and return|auto.?grade|autocalificar/i })
      .first();
    await expect(graderReady).toBeVisible({ timeout: 20000 });

    // If the turn-in has photos, they must be real, signed, loadable images.
    const photos = page.locator('img[alt="Fotos del trabajo"], img[alt="Submitted photos"]');
    const count = await photos.count();
    test.skip(count === 0, "this turn-in has no photos; nothing to assert");

    const src = await photos.first().getAttribute("src");
    expect(src).toMatch(/^https?:\/\//);
    const res = await page.request.get(src!);
    expect(res.status()).toBeLessThan(400);
  });
});
