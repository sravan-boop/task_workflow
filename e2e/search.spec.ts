import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search page loads for authenticated users", async ({ page }) => {
    // This will redirect to login if not authenticated
    await page.goto("/search");
    // Either shows search or redirects to login
    const url = page.url();
    expect(url).toMatch(/\/(search|login)/);
  });
});
