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
        .getByRole("button", { name: /continuar|siguiente|entrar|ingresar/i })
        .click();
      await page.getByLabel(/contraseña|password/i).fill(TEACHER_PASSWORD!);
      await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
      await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });
    });

    test.describe("gradebook", () => {
      test.skip(!CLASS_ID, "E2E_CLASS_ID not configured");

      test("editing a grade autosaves and survives a reload", async ({ page }) => {
        await page.goto("/");
        await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
        await page
          .getByRole("button", { name: /continuar|siguiente|entrar|ingresar/i })
          .click();
        await page.getByLabel(/contraseña|password/i).fill(TEACHER_PASSWORD!);
        await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
        await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });

        await page.goto(`/grupos/${CLASS_ID}`);
        // First editable grade cell (row 0, column 0) exposed by the gradebook.
        const cell = page.locator('input[data-cell="0:0"]');
        await expect(cell).toBeVisible({ timeout: 20000 });

        const value = "88";
        await cell.click();
        await cell.fill(value);
        // Blur/Enter commits and autosaves.
        await cell.press("Enter");
        await page.waitForTimeout(1500);

        await page.reload();
        const reloaded = page.locator('input[data-cell="0:0"]');
        await expect(reloaded).toBeVisible({ timeout: 20000 });
        await expect(reloaded).toHaveValue(value);
      });
    });
  });
});
