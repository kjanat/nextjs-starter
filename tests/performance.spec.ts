import { expect, test } from "@playwright/test";

test.describe("Performance Tests", () => {
  test("should load the homepage within performance budget", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/", { waitUntil: "networkidle" });

    const loadTime = Date.now() - startTime;

    // Homepage should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test("should have good Core Web Vitals", async ({ page }) => {
    await page.goto("/");

    // Measure First Contentful Paint (FCP)
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === "first-contentful-paint") {
              resolve(entry.startTime);
            }
          }
        }).observe({ entryTypes: ["paint"] });
      });
    });

    // FCP should be under 1.8 seconds (good threshold)
    expect(fcp).toBeLessThan(1800);
  });

  test("should handle multiple injections efficiently", async ({ page }) => {
    await page.goto("/");

    const startTime = Date.now();

    // Add multiple injections quickly
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="morning-injection-card"]');
      await page.fill('[data-testid="user-name-input"]', `User ${i}`);
      await page.click('[data-testid="submit-injection"]');

      // Wait for success message before next iteration
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 2000 });
    }

    const totalTime = Date.now() - startTime;

    // Should handle 5 injections in under 15 seconds
    expect(totalTime).toBeLessThan(15000);
  });

  test("should have efficient bundle size", async ({ page }) => {
    // Monitor network requests
    const responses: any[] = [];

    page.on("response", (response) => {
      responses.push({
        url: response.url(),
        size: response.headers()["content-length"],
        type: response.headers()["content-type"],
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Calculate total JavaScript bundle size
    const jsResponses = responses.filter(
      (r) => r.type?.includes("javascript") || r.url.includes(".js"),
    );

    const totalJsSize = jsResponses.reduce((total, response) => {
      return total + (parseInt(response.size) || 0);
    }, 0);

    // Total JS bundle should be under 500KB (conservative for modern apps)
    expect(totalJsSize).toBeLessThan(500 * 1024);
  });

  test("should render efficiently on low-end devices", async ({ page, browserName }) => {
    // Simulate low-end device
    await page.emulate({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      defaultBrowserType: browserName as any,
    });

    // Throttle CPU
    const client = await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    const startTime = Date.now();
    await page.goto("/");

    // Wait for main content to be visible
    await page.waitForSelector('[data-testid="morning-injection-card"]', { state: "visible" });

    const renderTime = Date.now() - startTime;

    // Should render within 5 seconds on throttled CPU
    expect(renderTime).toBeLessThan(5000);
  });

  test("should handle API response times efficiently", async ({ page }) => {
    const apiTimings: { [key: string]: number } = {};

    page.on("response", async (response) => {
      if (response.url().includes("/api/")) {
        const timing = response.timing();
        apiTimings[response.url()] = timing.responseEnd - timing.requestStart;
      }
    });

    await page.goto("/");

    // Trigger API calls by interacting with the app
    await page.click('[data-testid="morning-injection-card"]');
    await page.fill('[data-testid="user-name-input"]', "Performance Test User");
    await page.click('[data-testid="submit-injection"]');

    // Wait for API calls to complete
    await page.waitForTimeout(2000);

    // Check that API responses are within reasonable time
    for (const [url, timing] of Object.entries(apiTimings)) {
      expect(timing).toBeLessThan(2000); // 2 seconds max for any API call
    }
  });

  test("should handle large datasets efficiently", async ({ page }) => {
    // This would require seeding the database with a lot of data
    // For now, we'll test the history page with date filtering

    await page.goto("/history");

    const startTime = Date.now();

    // Test date filtering performance
    await page.fill('[data-testid="date-selector"]', "2024-01-01");
    await page.keyboard.press("Enter");

    // Wait for results to load
    await page.waitForSelector('[data-testid="injection-list"]', { state: "visible" });

    const filterTime = Date.now() - startTime;

    // Filtering should be fast even with large datasets
    expect(filterTime).toBeLessThan(1500);
  });

  test("should have efficient memory usage", async ({ page }) => {
    await page.goto("/");

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform memory-intensive operations
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="morning-injection-card"]');
      await page.fill('[data-testid="user-name-input"]', `Memory Test ${i}`);
      await page.click('[data-testid="submit-injection"]');
      await page.waitForSelector('[data-testid="success-message"]');
    }

    // Navigate between pages
    await page.click('a[href="/history"]');
    await page.click('a[href="/stats"]');
    await page.click('a[href="/"]');

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory usage shouldn't increase dramatically
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB increase max
  });

  test("should handle offline scenarios gracefully", async ({ page }) => {
    await page.goto("/");

    // Go offline
    await page.context().setOffline(true);

    const startTime = Date.now();

    // Try to perform actions while offline
    await page.click('[data-testid="morning-injection-card"]');
    await page.fill('[data-testid="user-name-input"]', "Offline User");
    await page.click('[data-testid="submit-injection"]');

    // Should show error quickly (not wait for timeout)
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });

    const errorTime = Date.now() - startTime;

    // Error should appear within 3 seconds
    expect(errorTime).toBeLessThan(3000);

    // Go back online
    await page.context().setOffline(false);
  });
});
