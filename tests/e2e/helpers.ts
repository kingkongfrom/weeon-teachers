import { test as base, expect, type Page } from "@playwright/test";

// Shared E2E helpers for the teacher web journeys (docs/testing.md §7 — QA-6).

const TEACHER_USER = process.env.E2E_TEACHER_USERNAME;
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD;

/** True when the teacher credentials are configured for this run. */
export const hasTeacherCredentials = Boolean(TEACHER_USER && TEACHER_PASSWORD);

/** Optional: a group id the seeded teacher owns, for gradebook journeys. */
export const seedClassId = process.env.E2E_CLASS_ID ?? null;

/**
 * Teacher login is two-step: enter username → continue → enter password.
 * Waits until the landing (`/inicio`) or first-password page renders.
 */
export async function loginAsTeacher(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
  await page.getByRole("button", { name: /continuar|siguiente|entrar|ingresar/i }).click();
  await page.getByLabel(/contraseña|password/i).fill(TEACHER_PASSWORD!);
  await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).click();
  await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });
}

export const test = base;
export { expect };
