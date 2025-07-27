import { describe, expect, it } from "vitest";
import { formatDate, formatFullDate, formatTime, getLastNDays, getToday } from "@/lib/utils";

describe("Date/Time Utilities", () => {
  describe("formatDate", () => {
    it("should format date string with weekday, month, and day", () => {
      const result = formatDate("2024-01-15T10:30:00Z");

      expect(result).toMatch(/Mon, Jan 15|Tue, Jan 15/); // Accounting for timezone differences
    });

    it("should handle different date formats", () => {
      const result = formatDate("2024-12-25");

      expect(result).toMatch(/Wed, Dec 25|Thu, Dec 25/);
    });
  });

  describe("formatTime", () => {
    it("should format time string in 12-hour format", () => {
      const result = formatTime("2024-01-15T10:30:00Z");

      expect(result).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });

    it("should handle undefined input", () => {
      const result = formatTime(undefined);

      expect(result).toBe("");
    });

    it("should handle empty string input", () => {
      const result = formatTime("");

      expect(result).toBe("");
    });

    it("should format midnight correctly", () => {
      const result = formatTime("2024-01-15T00:00:00Z");

      expect(result).toMatch(/12:00 AM/);
    });

    it("should format noon correctly", () => {
      const result = formatTime("2024-01-15T12:00:00Z");

      expect(result).toMatch(/12:00 PM/);
    });
  });

  describe("formatFullDate", () => {
    it("should format Date object with full weekday, month, day, and year", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatFullDate(date);

      expect(result).toMatch(/Monday, January 15, 2024|Tuesday, January 15, 2024/);
    });

    it("should handle different dates", () => {
      const date = new Date("2024-12-25T00:00:00Z");
      const result = formatFullDate(date);

      expect(result).toMatch(/Wednesday, December 25, 2024|Thursday, December 25, 2024/);
    });
  });

  describe("getToday", () => {
    it("should return today date in YYYY-MM-DD format", () => {
      const result = getToday();

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's actually today
      const today = new Date().toISOString().split("T")[0];
      expect(result).toBe(today);
    });
  });

  describe("getLastNDays", () => {
    it("should return array of date strings for last N days", () => {
      const result = getLastNDays(7);

      expect(result).toHaveLength(7);
      expect(result[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // First item should be today
      const today = new Date().toISOString().split("T")[0];
      expect(result[0]).toBe(today);
    });

    it("should return correct dates in descending order", () => {
      const result = getLastNDays(3);

      expect(result).toHaveLength(3);

      // Dates should be in descending order (most recent first)
      const date0 = new Date(result[0]);
      const date1 = new Date(result[1]);
      const date2 = new Date(result[2]);

      expect(date0.getTime()).toBeGreaterThan(date1.getTime());
      expect(date1.getTime()).toBeGreaterThan(date2.getTime());
    });

    it("should handle edge case of 1 day", () => {
      const result = getLastNDays(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(getToday());
    });

    it("should handle edge case of 0 days", () => {
      const result = getLastNDays(0);

      expect(result).toHaveLength(0);
    });
  });
});
