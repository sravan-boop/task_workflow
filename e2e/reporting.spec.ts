import { test, expect } from "@playwright/test";

test.describe("Reporting", () => {
  test("should navigate to reporting page", async ({ page }) => {
    await page.goto("/reporting");
    await expect(page.locator("text=Reporting")).toBeVisible();
  });

  test("should display metric cards", async ({ page }) => {
    await page.goto("/reporting");
    await expect(page.locator("text=Total tasks")).toBeVisible();
    await expect(page.locator("text=Completed")).toBeVisible();
    await expect(page.locator("text=In progress")).toBeVisible();
    await expect(page.locator("text=Overdue")).toBeVisible();
  });
});
