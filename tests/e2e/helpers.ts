import { test as base, expect, type Page } from "@playwright/test";

// Shared E2E helpers for the teacher web journeys (docs/testing.md §7 — QA-6).

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;

/** True when the teacher credentials are configured for this run. */
export const hasTeacherCredentials = Boolean(TEACHER_USER && TEACHER_PASSWORD);

/** Optional: a group id the seeded teacher owns, for gradebook journeys. */
export const seedClassId = process.env.E2E_CLASS_ID ?? null;

/**
 * Teacher login. Two shapes exist:
 *   - one form: user + password + Entrar
 *   - two steps: user → Continuar → password → Entrar
 * The password input is targeted by `type` because its label also matches the
 * "Mostrar contraseña" toggle (which broke every journey before 20 Oct).
 */
export async function loginAsTeacher(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);

  const password = page.locator('input[type="password"]');
  if ((await password.count()) === 0) {
    await page.getByRole("button", { name: /continuar|siguiente/i }).click();
  }
  await password.first().waitFor({ state: "visible", timeout: 20000 });
  await password.first().fill(TEACHER_PASSWORD!);

  await page.getByRole("button", { name: /^entrar$|ingresar|iniciar/i }).click();
  await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });
}

export const test = base;
export { expect };
