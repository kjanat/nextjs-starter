import { expect, test } from "@playwright/test";

test.describe("Injection Tracking Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the main dashboard", async ({ page }) => {
    // Check for main heading
    await expect(page.getByRole("heading", { name: /insulin injection tracker/i })).toBeVisible();

    // Check for morning and evening injection cards
    await expect(page.getByText(/morning injection/i)).toBeVisible();
    await expect(page.getByText(/evening injection/i)).toBeVisible();
  });

  test("should add a morning injection", async ({ page }) => {
    // Click on morning injection card/button
    await page.click('[data-testid="morning-injection-card"]');

    // Fill out the injection form
    await page.fill('[data-testid="user-name-input"]', "John Doe");

    // Select current time or use default
    const now = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
    await page.fill('[data-testid="injection-time-input"]', now);

    // Add optional notes
    await page.fill('[data-testid="notes-input"]', "Morning insulin dose - feeling good");

    // Submit the form
    await page.click('[data-testid="submit-injection"]');

    // Wait for success message or UI update
    await expect(page.getByText(/injection recorded/i)).toBeVisible();

    // Verify morning injection is now marked as complete
    await expect(page.locator('[data-testid="morning-injection-card"]')).toHaveClass(/bg-green/);
  });

  test("should add an evening injection", async ({ page }) => {
    // Click on evening injection card/button
    await page.click('[data-testid="evening-injection-card"]');

    // Fill out the injection form
    await page.fill('[data-testid="user-name-input"]', "Jane Doe");

    // Select current time
    const now = new Date().toISOString().slice(0, 16);
    await page.fill('[data-testid="injection-time-input"]', now);

    // Submit without notes (optional field)
    await page.click('[data-testid="submit-injection"]');

    // Wait for success confirmation
    await expect(page.getByText(/injection recorded/i)).toBeVisible();

    // Verify evening injection is marked as complete
    await expect(page.locator('[data-testid="evening-injection-card"]')).toHaveClass(/bg-green/);
  });

  test("should navigate to history page", async ({ page }) => {
    // Click on history navigation
    await page.click('a[href="/history"]');

    // Wait for history page to load
    await expect(page.getByRole("heading", { name: /injection history/i })).toBeVisible();

    // Check for date selector or filter
    await expect(page.locator('[data-testid="date-selector"]')).toBeVisible();
  });

  test("should navigate to stats page", async ({ page }) => {
    // Click on stats navigation
    await page.click('a[href="/stats"]');

    // Wait for stats page to load
    await expect(page.getByRole("heading", { name: /statistics/i })).toBeVisible();

    // Check for key statistics
    await expect(page.getByText(/compliance rate/i)).toBeVisible();
    await expect(page.getByText(/total injections/i)).toBeVisible();
  });

  test("should handle form validation", async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="morning-injection-card"]');
    await page.click('[data-testid="submit-injection"]');

    // Should show validation errors
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });

  test("should display today status correctly", async ({ page }) => {
    // Check initial state - both should be incomplete
    await expect(page.locator('[data-testid="morning-injection-card"]')).not.toHaveClass(
      /bg-green/,
    );
    await expect(page.locator('[data-testid="evening-injection-card"]')).not.toHaveClass(
      /bg-green/,
    );

    // Add morning injection
    await page.click('[data-testid="morning-injection-card"]');
    await page.fill('[data-testid="user-name-input"]', "Test User");
    await page.click('[data-testid="submit-injection"]');

    // Wait for UI update
    await page.waitForTimeout(1000);

    // Morning should now be complete, evening still incomplete
    await expect(page.locator('[data-testid="morning-injection-card"]')).toHaveClass(/bg-green/);
    await expect(page.locator('[data-testid="evening-injection-card"]')).not.toHaveClass(
      /bg-green/,
    );
  });
});

test.describe("Navigation and Layout", () => {
  test("should have working navigation between pages", async ({ page }) => {
    await page.goto("/");

    // Test navigation to history
    await page.click('a[href="/history"]');
    await expect(page).toHaveURL("/history");

    // Test navigation to stats
    await page.click('a[href="/stats"]');
    await expect(page).toHaveURL("/stats");

    // Test navigation back to home
    await page.click('a[href="/"]');
    await expect(page).toHaveURL("/");
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check that content is still visible and accessible
    await expect(page.getByRole("heading", { name: /insulin injection tracker/i })).toBeVisible();
    await expect(page.getByText(/morning injection/i)).toBeVisible();
    await expect(page.getByText(/evening injection/i)).toBeVisible();

    // Check that buttons are tap-friendly (at least 44px)
    const morningCard = page.locator('[data-testid="morning-injection-card"]');
    const boundingBox = await morningCard.boundingBox();
    expect(boundingBox?.height).toBeGreaterThan(44);
  });
});

test.describe("Data Persistence", () => {
  test("should persist injection data across page reloads", async ({ page }) => {
    // Add an injection
    await page.goto("/");
    await page.click('[data-testid="morning-injection-card"]');
    await page.fill('[data-testid="user-name-input"]', "Persistent User");
    await page.click('[data-testid="submit-injection"]');

    // Wait for success
    await expect(page.getByText(/injection recorded/i)).toBeVisible();

    // Reload the page
    await page.reload();

    // Check that the injection is still marked as complete
    await expect(page.locator('[data-testid="morning-injection-card"]')).toHaveClass(/bg-green/);
  });

  test("should show injection in history", async ({ page }) => {
    // Add an injection with specific details
    await page.goto("/");
    await page.click('[data-testid="morning-injection-card"]');
    await page.fill('[data-testid="user-name-input"]', "History Test User");
    await page.fill('[data-testid="notes-input"]', "Test injection for history");
    await page.click('[data-testid="submit-injection"]');

    // Navigate to history
    await page.click('a[href="/history"]');

    // Check that the injection appears in history
    await expect(page.getByText("History Test User")).toBeVisible();
    await expect(page.getByText("Test injection for history")).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("should handle network errors gracefully", async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    await page.goto("/");

    // Try to add an injection
    await page.click('[data-testid="morning-injection-card"]');
    await page.fill('[data-testid="user-name-input"]', "Offline User");
    await page.click('[data-testid="submit-injection"]');

    // Should show an error message
    await expect(page.getByText(/network error|failed to save/i)).toBeVisible();

    // Restore online mode
    await page.context().setOffline(false);
  });

  test("should recover from errors and allow retry", async ({ page }) => {
    await page.goto("/");

    // If there's a retry mechanism, test it
    // This would depend on the actual error handling implementation

    // Simulate an error condition and recovery
    // await page.click('[data-testid="retry-button"]')
    // await expect(page.getByText(/injection recorded/i)).toBeVisible()
  });
});
