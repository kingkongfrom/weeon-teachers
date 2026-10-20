import { test, expect } from "@playwright/test";

// Journey 4 (docs/testing.md §7 — QA-6): marking a student present persists
// after a reload.
//
// The register (components/attendance/attendance-register.tsx) shows each
// student as a status chip that opens a `listbox` of codes; it is not a
// radiogroup (that assumption made this journey fail since the UI changed).

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;
const CLASS_ID = process.env.E2E_CLASS_ID;
const hasCreds = Boolean(TEACHER_USER && TEACHER_PASSWORD && CLASS_ID);

test.describe("Teacher attendance", () => {
  test.skip(!hasCreds, "teacher credentials + E2E_CLASS_ID not configured");

  test("marking a student present persists after reload", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
    const password = page.locator('input[type="password"]');
    if ((await password.count()) === 0) {
      await page.getByRole("button", { name: /continuar|siguiente/i }).click();
    }
    await password.first().fill(TEACHER_PASSWORD!);
    await page.getByRole("button", { name: /^entrar$|ingresar|iniciar/i }).click();
    await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });

    await page.goto(`/aula-virtual/${CLASS_ID}?tab=asistencia`);
    await expect(page.getByRole("tab", { name: /asistencia/i })).toBeVisible({ timeout: 20000 });

    // First student's status chip opens a listbox; pick the present option.
    const chip = page.locator('button[aria-haspopup="listbox"]').first();
    await expect(chip).toBeVisible({ timeout: 20000 });
    await chip.click();
    const listbox = page.getByRole("listbox").first();
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole("option").first().click();

    // Autosave debounce is ~600 ms; let the round-trip settle.
    await page.waitForTimeout(2000);

    await page.reload();
    const reloaded = page.locator('button[aria-haspopup="listbox"]').first();
    await expect(reloaded).toBeVisible({ timeout: 20000 });
    // A saved mark renders a short code (P/TJ/TI/AJ/A), not the empty label.
    await expect(reloaded).toHaveText(/^(P|TJ|TI|AJ|A|Presente|Present)$/i, { timeout: 10000 });
  });
});
