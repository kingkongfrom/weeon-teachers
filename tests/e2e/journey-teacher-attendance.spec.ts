import { test, expect } from "@playwright/test";

// Journey 3 (docs/testing.md §7): teacher marks attendance in aula virtual; the
// value persists. Requires a seeded teacher + class (E2E_CLASS_ID).

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;
const CLASS_ID = process.env.E2E_CLASS_ID;
const hasCreds = Boolean(TEACHER_USER && TEACHER_PASSWORD && CLASS_ID);

test.describe("Teacher attendance", () => {
  test.skip(!hasCreds, "teacher credentials + E2E_CLASS_ID not configured");

  test("marking a student present persists after reload", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
    await page
      .getByRole("button", { name: /continuar|siguiente|entrar|ingresar/i })
      .click();
    await page.getByLabel(/contraseña|password/i).fill(TEACHER_PASSWORD!);
    await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
    await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });

    await page.goto(`/aula-virtual/${CLASS_ID}?tab=asistencia`);
    const tab = page.getByRole("tab", { name: /asistencia/i });
    await expect(tab).toBeVisible({ timeout: 20000 });

    // Each student row is a radiogroup; the "Presente" radio is first.
    const firstGroup = page.getByRole("radiogroup").first();
    await expect(firstGroup).toBeVisible({ timeout: 20000 });
    const present = firstGroup.getByRole("radio", { name: /presente|present/i }).first();
    await present.click();

    // Autosave debounce is 600ms; give the round-trip time to settle.
    await page.waitForTimeout(1500);

    await page.reload();
    const persisted = page
      .getByRole("radiogroup")
      .first()
      .getByRole("radio", { name: /presente|present/i })
      .first();
    await expect(persisted).toHaveAttribute("aria-checked", "true", {
      timeout: 20000,
    });
  });
});
