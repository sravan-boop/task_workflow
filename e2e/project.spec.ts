import { test, expect } from "@playwright/test";

test.describe("Project Management", () => {
  test("should display project list in sidebar", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("text=Projects")).toBeVisible();
  });

  test("should show project views tabs", async ({ page }) => {
    // Navigate to a project and verify all view tabs exist
    await page.goto("/home");
    const projectLink = page.locator("aside a[href^='/projects/']").first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      await expect(page.locator("text=List")).toBeVisible();
      await expect(page.locator("text=Board")).toBeVisible();
      await expect(page.locator("text=Timeline")).toBeVisible();
      await expect(page.locator("text=Calendar")).toBeVisible();
    }
  });

  test("should switch between project views", async ({ page }) => {
    await page.goto("/home");
    const projectLink = page.locator("aside a[href^='/projects/']").first();
    if (await projectLink.isVisible()) {
      await projectLink.click();
      // Click Board view
      await page.locator("button:has-text('Board')").click();
      await page.waitForTimeout(500);
      // Click Calendar view
      await page.locator("button:has-text('Calendar')").click();
      await page.waitForTimeout(500);
    }
  });
});
