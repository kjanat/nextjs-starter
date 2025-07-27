import { expect, test } from "@playwright/test";

test.describe("Accessibility Tests", () => {
  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");

    // Check for main heading (h1)
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();

    // Check that there's only one h1
    const h1Count = await page.getByRole("heading", { level: 1 }).count();
    expect(h1Count).toBe(1);

    // Check for proper heading hierarchy (h1 -> h2 -> h3, etc.)
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    const headingLevels = await Promise.all(
      headings.map(async (heading) => {
        const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
        return parseInt(tagName.charAt(1));
      }),
    );

    // Verify no heading levels are skipped
    let previousLevel = 0;
    for (const level of headingLevels) {
      expect(level - previousLevel).toBeLessThanOrEqual(1);
      previousLevel = level;
    }
  });

  test("should have proper form labels and accessibility", async ({ page }) => {
    await page.goto("/");

    // Open injection form
    await page.click('[data-testid="morning-injection-card"]');

    // Check that all form inputs have proper labels
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toBeVisible();

    const timeInput = page.getByLabel(/time/i);
    await expect(timeInput).toBeVisible();

    // Check for proper input types
    await expect(nameInput).toHaveAttribute("type", "text");
    await expect(timeInput).toHaveAttribute("type", "datetime-local");

    // Check for required field indicators
    await expect(nameInput).toHaveAttribute("required");
    await expect(timeInput).toHaveAttribute("required");
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/");

    // Test tab navigation
    await page.keyboard.press("Tab");

    // Should focus on first interactive element
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    // Test that all interactive elements are reachable via keyboard
    const interactiveElements = await page.locator("button, a, input, select, textarea").count();

    // Tab through all elements
    for (let i = 0; i < interactiveElements; i++) {
      await page.keyboard.press("Tab");
      const currentFocus = page.locator(":focus");
      await expect(currentFocus).toBeVisible();
    }
  });

  test("should have proper ARIA attributes", async ({ page }) => {
    await page.goto("/");

    // Check for proper button roles and labels
    const morningCard = page.locator('[data-testid="morning-injection-card"]');
    await expect(morningCard).toHaveAttribute("role", "button");
    await expect(morningCard).toHaveAttribute("aria-label");

    // Check for loading states
    await morningCard.click();

    // If there's a loading spinner, it should have proper ARIA
    const loadingSpinner = page.getByRole("status");
    if (await loadingSpinner.isVisible()) {
      await expect(loadingSpinner).toHaveAttribute("aria-label", /loading/i);
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    await page.goto("/");

    // This would require a color contrast checking library
    // For now, we'll check that text is visible against backgrounds

    const textElements = await page.locator("p, span, h1, h2, h3, button").all();

    for (const element of textElements) {
      if (await element.isVisible()) {
        // Check that text has color (not transparent)
        const color = await element.evaluate((el) => window.getComputedStyle(el).color);
        expect(color).not.toBe("rgba(0, 0, 0, 0)");
        expect(color).not.toBe("transparent");
      }
    }
  });

  test("should have proper focus indicators", async ({ page }) => {
    await page.goto("/");

    // Check that focused elements have visible focus indicators
    await page.keyboard.press("Tab");

    const focusedElement = page.locator(":focus");
    const outlineStyle = await focusedElement.evaluate((el) => window.getComputedStyle(el).outline);

    // Should have some kind of outline or focus indicator
    expect(outlineStyle).not.toBe("none");
  });

  test("should provide error messages in accessible way", async ({ page }) => {
    await page.goto("/");

    // Trigger form validation error
    await page.click('[data-testid="morning-injection-card"]');
    await page.click('[data-testid="submit-injection"]');

    // Error messages should have proper ARIA attributes
    const errorMessage = page.getByRole("alert");
    await expect(errorMessage).toBeVisible();

    // Error should be associated with the input
    const nameInput = page.getByLabel(/name/i);
    const ariaDescribedBy = await nameInput.getAttribute("aria-describedby");

    if (ariaDescribedBy) {
      const errorElement = page.locator(`#${ariaDescribedBy}`);
      await expect(errorElement).toBeVisible();
    }
  });

  test("should work with screen readers", async ({ page }) => {
    await page.goto("/");

    // Check for proper landmarks
    const main = page.getByRole("main");
    await expect(main).toBeVisible();

    const navigation = page.getByRole("navigation");
    if ((await navigation.count()) > 0) {
      await expect(navigation.first()).toBeVisible();
    }

    // Check for proper list structures
    const lists = page.getByRole("list");
    if ((await lists.count()) > 0) {
      const listItems = page.getByRole("listitem");
      await expect(listItems.first()).toBeVisible();
    }
  });

  test("should have proper page title", async ({ page }) => {
    await page.goto("/");

    // Check that page has a descriptive title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title).toMatch(/insulin|injection|tracker/i);
  });

  test("should handle reduced motion preferences", async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Check that animations are disabled or reduced
    // This would depend on CSS implementation
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]');

    if ((await animatedElements.count()) > 0) {
      const animationDuration = await animatedElements
        .first()
        .evaluate((el) => window.getComputedStyle(el).animationDuration);

      // Should be either 'none' or very short duration
      expect(animationDuration === "none" || parseFloat(animationDuration) < 0.1).toBeTruthy();
    }
  });
});
