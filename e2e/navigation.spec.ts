import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page has sign up link", async ({ page }) => {
    await page.goto("/login");
    const signUpLink = page.locator('a[href="/register"]');
    await expect(signUpLink).toBeVisible();
  });

  test("register page has sign in link", async ({ page }) => {
    await page.goto("/register");
    const signInLink = page.locator('a[href="/login"]');
    await expect(signInLink).toBeVisible();
  });
});
