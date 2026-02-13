import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Settings")).toBeVisible();
  });

  test("should display settings tabs", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=Profile")).toBeVisible();
    await expect(page.locator("text=Notifications")).toBeVisible();
    await expect(page.locator("text=Security")).toBeVisible();
    await expect(page.locator("text=Display")).toBeVisible();
  });

  test("should switch between settings tabs", async ({ page }) => {
    await page.goto("/settings");
    await page.locator("button:has-text('Notifications')").click();
    await expect(page.locator("text=Notification settings")).toBeVisible();
    await page.locator("button:has-text('Security')").click();
    await expect(page.locator("text=Security settings")).toBeVisible();
    await page.locator("button:has-text('Display')").click();
    await expect(page.locator("text=Display settings")).toBeVisible();
  });
});
