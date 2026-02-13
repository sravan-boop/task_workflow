import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page loads correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("Log in");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("register page loads correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("h1")).toContainText("Create");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("login form shows validation errors", async ({ page }) => {
    await page.goto("/login");
    await page.click('button[type="submit"]');
    // Form should not navigate away without valid input
    await expect(page).toHaveURL(/.*login.*/);
  });

  test("register form shows validation errors", async ({ page }) => {
    await page.goto("/register");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*register.*/);
  });
});
