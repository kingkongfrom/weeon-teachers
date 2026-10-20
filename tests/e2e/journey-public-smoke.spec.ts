import { test, expect } from "@playwright/test";

// Journey 1 (docs/testing.md §7 — QA-6): an unauthenticated visitor gets a
// working login page, and every public entry point answers without a 5xx.
//
// This is the cheapest guard against the class of bug that shipped on 20 Oct
// (a change that redirects or blanks a screen): if the shell breaks, `/` stops
// rendering the form and this fails before merge.

test.describe("Public surface", () => {
  test("login page renders and is interactive", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);

    const userField = page.getByLabel(/usuario|correo|email/i);
    await expect(userField).toBeVisible({ timeout: 20000 });
    await userField.fill("no-existe@example.com");
    await expect(userField).toHaveValue("no-existe@example.com");
  });

  test("protected routes redirect to login instead of erroring", async ({ page }) => {
    const res = await page.goto("/inicio");
    expect(res?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/(login)?$|\/$/);
  });

  test("a missing route renders the 404 screen, not a crash", async ({ page }) => {
    const res = await page.goto("/esta-ruta-no-existe-12345");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /ir al inicio|go home/i })).toBeVisible();
  });
});
