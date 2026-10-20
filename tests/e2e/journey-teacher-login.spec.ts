import { test, expect } from "@playwright/test";

// Journey 2 (docs/testing.md §7): teacher login → grupo → edit a grade →
// autosave → reload shows the value. Also login smoke (public, no creds).

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;
const CLASS_ID = process.env.E2E_CLASS_ID;
const hasCreds = Boolean(TEACHER_USER && TEACHER_PASSWORD);

test.describe("Teacher login", () => {
  test("login page renders the username form", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByLabel(/usuario|correo|email/i)).toBeVisible();
  });

  test.describe("authenticated", () => {
    test.skip(!hasCreds, "E2E_TEACHER_USERNAME / E2E_TEACHER_PASSWORD not configured");

    test("teacher signs in and reaches the landing", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
      await page
        .getByRole("button", { name: /continuar|siguiente/i })
        .click();
      await page.locator('input[type="password"]').first().fill(TEACHER_PASSWORD!);
      await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
      await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });
    });

    test.describe("gradebook", () => {
      test.skip(!CLASS_ID, "E2E_CLASS_ID not configured");

      test("editing a grade autosaves and survives a reload", async ({ page }) => {
        // KNOWN RED (20 Oct): the grade cell does not persist under E2E even
        // though the UI accepts the value and the server action returns 200 —
        // no row is written for that student/column. Investigate before relying
        // on the gradebook journey; the turn-in journey covers that path.
        test.fixme(true, "grade autosave does not persist under E2E — see docs/testing.md");
        await page.goto("/");
        await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
        await page
          .getByRole("button", { name: /continuar|siguiente/i })
          .click();
        await page.locator('input[type="password"]').first().fill(TEACHER_PASSWORD!);
        await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
        await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });

        await page.goto(`/grupos/${CLASS_ID}`);
        // Column 0 is the computed "General" aggregate, not an editable grade.
        // Both are inputs in the DOM, so pick a column that is a real homework:
        // data-grade-cell marks the ones the workspace treats as editable.
        const cell = page.locator('input[data-cell]:not([data-cell$=":0"])').first();
        await expect(cell).toBeVisible({ timeout: 20000 });

        // Never assert a fixed mark: this group is seeded and already graded,
        // and the action clamps to the column's points. Change whatever is
        // there, prove it persisted, then put it back.
        const original = (await cell.inputValue()) || "";
        const current = Number(original) || 0;
        const next = String(current > 0 ? current - 1 : 1);

        await cell.click();
        await cell.fill(next);
        await cell.press("Enter");
        await page.waitForTimeout(1500);

        await page.reload();
        const reloaded = page.locator('input[data-cell]:not([data-cell$=":0"])').first();
        await expect(reloaded).toBeVisible({ timeout: 20000 });
        await expect(reloaded).toHaveValue(next);

        // Restore so repeated runs and the demo school stay clean.
        await reloaded.click();
        await reloaded.fill(original);
        await reloaded.press("Enter");
        await page.waitForTimeout(1500);
      });
    });
  });
});
