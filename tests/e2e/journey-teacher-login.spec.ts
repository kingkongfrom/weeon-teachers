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
        // The Apoyos gate is why this journey used to look broken: row 0's
        // student has an active support whose period registro is pending, so
        // saveGrade deliberately writes nothing and returns the flags. Edit a
        // different student's cell instead.
        await page.goto("/");
        await page.getByLabel(/usuario|correo|email/i).fill(TEACHER_USER!);
        const password = page.locator('input[type="password"]');
        if ((await password.count()) === 0) {
          await page.getByRole("button", { name: /continuar|siguiente/i }).click();
        }
        await password.first().fill(TEACHER_PASSWORD!);
        await page.getByRole("button", { name: /^entrar$|ingresar|iniciar/i }).click();
        await page.waitForURL(/\/(inicio|crear-contrasena)/, { timeout: 30000 });

        await page.goto(`/grupos/${CLASS_ID}`);
        // Pick the first cell whose column is worth more than 1 point, so the
        // value we write cannot collide with the clamp (some columns are 1 pt).
        const cells = page.locator('input[data-cell]:not([data-cell$=":0"])');
        await expect(cells.first()).toBeVisible({ timeout: 20000 });
        const count = await cells.count();
        let cell = cells.first();
        let target = "";
        for (let i = 0; i < count; i += 1) {
          const candidate = cells.nth(i);
          const label = (await candidate.getAttribute("aria-label")) || "";
          const max = Number(label.match(/de\s+(\d+(?:\.\d+)?)/)?.[1] ?? "0");
          if (max >= 5) {
            cell = candidate;
            target = (await candidate.getAttribute("data-cell"))!;
            break;
          }
        }
        test.skip(!target, "no grade column worth ≥5 points to edit");
        await expect(cell).toBeVisible({ timeout: 20000 });

        const label = (await cell.getAttribute("aria-label")) || "";
        const max = Number(label.match(/de\s+(\d+(?:\.\d+)?)/)?.[1] ?? "100") || 100;
        const original = (await cell.inputValue()) || "";
        const next = original === String(max) ? String(Math.max(0, max - 1)) : String(max);

        // The Apoyos flags arrive asynchronously. Give them time to settle so we
        // are not typing into a row whose gate has not rendered yet.
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(1500);

        await cell.click();
        await cell.fill(next);
        await cell.press("Enter");

        // The write goes through a server action: on a slow runner the reload
        // can beat it. Poll the persisted value rather than sleeping once.
        await expect
          .poll(
            async () => {
              await page.reload();
              return page.locator(`input[data-cell="${target}"]`).inputValue();
            },
            { timeout: 30000, intervals: [2000] },
          )
          .toBe(next);

        // Restore so repeated runs and the demo school stay clean.
        const restored = page.locator(`input[data-cell="${target}"]`);
        await restored.click();
        await restored.fill(original);
        await restored.press("Enter");
        await expect
          .poll(
            async () => {
              await page.reload();
              return page.locator(`input[data-cell="${target}"]`).inputValue();
            },
            { timeout: 30000, intervals: [2000] },
          )
          .toBe(original);
      });
    });
  });
});
