import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import type { InjectionEnhanced } from "@/db/schema";

export interface TimePattern {
  hour: number;
  minute: number;
  count: number;
  averageGlucose?: number;
}

export interface DayOfWeekPattern {
  dayOfWeek: number; // 0-6, where 0 is Sunday
  dayName: string;
  totalInjections: number;
  morningCount: number;
  eveningCount: number;
  complianceRate: number;
}

export interface ComplianceTrend {
  date: Date;
  dateLabel: string;
  expectedDoses: number;
  actualDoses: number;
  complianceRate: number;
  perfectDay: boolean;
}

export interface PredictiveInsight {
  type: "time_pattern" | "day_pattern" | "compliance_trend" | "glucose_pattern";
  message: string;
  confidence: number; // 0-1
  data?: unknown;
}

export interface AdvancedAnalytics {
  timePatterns: TimePattern[];
  dayOfWeekPatterns: DayOfWeekPattern[];
  complianceTrends: {
    daily: ComplianceTrend[];
    weekly: ComplianceTrend[];
    monthly: ComplianceTrend[];
  };
  insights: PredictiveInsight[];
  glucosePatterns?: {
    averageBeforeMeal: Record<string, number>;
    averageAfterMeal: Record<string, number>;
    timeInRange: number; // percentage
  };
}

export class AnalyticsCalculator {
  /**
   * Calculate time-of-day injection patterns
   */
  static calculateTimePatterns(injections: InjectionEnhanced[]): TimePattern[] {
    const timeMap = new Map<
      string,
      { count: number; totalGlucose: number; glucoseCount: number }
    >();

    injections.forEach((injection) => {
      const hour = injection.injectionTime.getHours();
      const minute = Math.floor(injection.injectionTime.getMinutes() / 15) * 15; // Round to 15-minute intervals
      const key = `${hour}:${minute}`;

      if (!timeMap.has(key)) {
        timeMap.set(key, { count: 0, totalGlucose: 0, glucoseCount: 0 });
      }

      const data = timeMap.get(key)!;
      data.count++;

      if (injection.bloodGlucoseBefore) {
        data.totalGlucose += injection.bloodGlucoseBefore;
        data.glucoseCount++;
      }
    });

    return Array.from(timeMap.entries())
      .map(([time, data]) => {
        const [hour, minute] = time.split(":").map(Number);
        return {
          hour,
          minute,
          count: data.count,
          averageGlucose: data.glucoseCount > 0 ? data.totalGlucose / data.glucoseCount : undefined,
        };
      })
      .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  }

  /**
   * Calculate day-of-week compliance patterns
   */
  static calculateDayOfWeekPatterns(
    injections: InjectionEnhanced[],
    daysToAnalyze: number = 30,
  ): DayOfWeekPattern[] {
    const startDate = subDays(new Date(), daysToAnalyze);
    const dayMap = new Map<
      number,
      { total: number; morning: number; evening: number; days: Set<string> }
    >();

    // Initialize all days of week
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, { total: 0, morning: 0, evening: 0, days: new Set() });
    }

    // Count injections by day of week
    injections
      .filter((inj) => inj.injectionTime >= startDate)
      .forEach((injection) => {
        const dayOfWeek = injection.injectionTime.getDay();
        const dateKey = format(injection.injectionTime, "yyyy-MM-dd");
        const data = dayMap.get(dayOfWeek)!;

        data.total++;
        data.days.add(dateKey);

        if (injection.injectionType === "morning") {
          data.morning++;
        } else if (injection.injectionType === "evening") {
          data.evening++;
        }
      });

    // Calculate patterns
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return Array.from(dayMap.entries()).map(([dayOfWeek, data]) => {
      const expectedDosesPerDay = 2; // morning + evening
      const expectedDoses = data.days.size * expectedDosesPerDay;
      const complianceRate = expectedDoses > 0 ? (data.total / expectedDoses) * 100 : 0;

      return {
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        totalInjections: data.total,
        morningCount: data.morning,
        eveningCount: data.evening,
        complianceRate: Math.round(complianceRate * 10) / 10,
      };
    });
  }

  /**
   * Calculate compliance trends over time
   */
  static calculateComplianceTrends(
    injections: InjectionEnhanced[],
    daysBack: number = 30,
  ): {
    daily: ComplianceTrend[];
    weekly: ComplianceTrend[];
    monthly: ComplianceTrend[];
  } {
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, daysBack));

    // Group injections by date
    const injectionsByDate = new Map<string, InjectionEnhanced[]>();
    injections
      .filter((inj) => inj.injectionTime >= startDate && inj.injectionTime <= endDate)
      .forEach((injection) => {
        const dateKey = format(injection.injectionTime, "yyyy-MM-dd");
        if (!injectionsByDate.has(dateKey)) {
          injectionsByDate.set(dateKey, []);
        }
        injectionsByDate.get(dateKey)!.push(injection);
      });

    // Daily trends
    const dailyTrends = eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const dayInjections = injectionsByDate.get(dateKey) || [];
      const morningDone = dayInjections.some((inj) => inj.injectionType === "morning");
      const eveningDone = dayInjections.some((inj) => inj.injectionType === "evening");
      const expectedDoses = 2;
      const actualDoses = (morningDone ? 1 : 0) + (eveningDone ? 1 : 0);

      return {
        date,
        dateLabel: format(date, "MMM d"),
        expectedDoses,
        actualDoses,
        complianceRate: (actualDoses / expectedDoses) * 100,
        perfectDay: actualDoses === expectedDoses,
      };
    });

    // Weekly trends
    const weeklyTrends = eachWeekOfInterval({ start: startDate, end: endDate }).map((weekStart) => {
      const weekEnd = endOfWeek(weekStart);
      const weekDays = eachDayOfInterval({
        start: weekStart >= startDate ? weekStart : startDate,
        end: weekEnd <= endDate ? weekEnd : endDate,
      });

      let totalExpected = 0;
      let totalActual = 0;
      let perfectDays = 0;

      weekDays.forEach((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const dayInjections = injectionsByDate.get(dateKey) || [];
        const morningDone = dayInjections.some((inj) => inj.injectionType === "morning");
        const eveningDone = dayInjections.some((inj) => inj.injectionType === "evening");
        const actualDoses = (morningDone ? 1 : 0) + (eveningDone ? 1 : 0);

        totalExpected += 2;
        totalActual += actualDoses;
        if (actualDoses === 2) perfectDays++;
      });

      return {
        date: weekStart,
        dateLabel: `Week of ${format(weekStart, "MMM d")}`,
        expectedDoses: totalExpected,
        actualDoses: totalActual,
        complianceRate: totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0,
        perfectDay: perfectDays === weekDays.length,
      };
    });

    // Monthly trends
    const monthlyTrends = eachMonthOfInterval({ start: startDate, end: endDate }).map(
      (monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const monthDays = eachDayOfInterval({
          start: monthStart >= startDate ? monthStart : startDate,
          end: monthEnd <= endDate ? monthEnd : endDate,
        });

        let totalExpected = 0;
        let totalActual = 0;
        let perfectDays = 0;

        monthDays.forEach((date) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayInjections = injectionsByDate.get(dateKey) || [];
          const morningDone = dayInjections.some((inj) => inj.injectionType === "morning");
          const eveningDone = dayInjections.some((inj) => inj.injectionType === "evening");
          const actualDoses = (morningDone ? 1 : 0) + (eveningDone ? 1 : 0);

          totalExpected += 2;
          totalActual += actualDoses;
          if (actualDoses === 2) perfectDays++;
        });

        return {
          date: monthStart,
          dateLabel: format(monthStart, "MMM yyyy"),
          expectedDoses: totalExpected,
          actualDoses: totalActual,
          complianceRate: totalExpected > 0 ? (totalActual / totalExpected) * 100 : 0,
          perfectDay: perfectDays === monthDays.length,
        };
      },
    );

    return {
      daily: dailyTrends,
      weekly: weeklyTrends,
      monthly: monthlyTrends,
    };
  }

  /**
   * Generate predictive insights based on patterns
   */
  static generateInsights(
    injections: InjectionEnhanced[],
    timePatterns: TimePattern[],
    dayPatterns: DayOfWeekPattern[],
  ): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];

    // Time pattern insights
    const mostCommonTimes = timePatterns.sort((a, b) => b.count - a.count).slice(0, 3);
    if (mostCommonTimes.length > 0) {
      const topTime = mostCommonTimes[0];
      insights.push({
        type: "time_pattern",
        message: `You usually inject at ${topTime.hour}:${topTime.minute.toString().padStart(2, "0")}`,
        confidence: topTime.count / injections.length,
        data: topTime,
      });
    }

    // Day of week insights
    const bestDay = dayPatterns.reduce((best, current) =>
      current.complianceRate > best.complianceRate ? current : best,
    );
    const worstDay = dayPatterns.reduce((worst, current) =>
      current.complianceRate < worst.complianceRate ? current : worst,
    );

    if (bestDay.complianceRate > worstDay.complianceRate + 20) {
      insights.push({
        type: "day_pattern",
        message: `Your compliance is best on ${bestDay.dayName}s (${bestDay.complianceRate}%) and lowest on ${worstDay.dayName}s (${worstDay.complianceRate}%)`,
        confidence: 0.8,
        data: { bestDay, worstDay },
      });
    }

    // Recent trend insight
    const recentInjections = injections.filter(
      (inj) => inj.injectionTime >= subDays(new Date(), 7),
    );
    const recentCompliance = (recentInjections.length / 14) * 100; // 14 = 7 days * 2 doses

    if (recentCompliance < 70) {
      insights.push({
        type: "compliance_trend",
        message: "Your compliance has been lower than usual this week. Consider setting reminders.",
        confidence: 0.9,
        data: { recentCompliance },
      });
    } else if (recentCompliance > 90) {
      insights.push({
        type: "compliance_trend",
        message: "Great job! Your compliance has been excellent this week!",
        confidence: 0.9,
        data: { recentCompliance },
      });
    }

    // Glucose pattern insights (if available)
    const glucoseReadings = injections.filter((inj) => inj.bloodGlucoseBefore !== null);
    if (glucoseReadings.length > 10) {
      const avgGlucose =
        glucoseReadings.reduce((sum, inj) => sum + (inj.bloodGlucoseBefore || 0), 0) /
        glucoseReadings.length;
      const targetMin = 70;
      const targetMax = 180;

      if (avgGlucose < targetMin) {
        insights.push({
          type: "glucose_pattern",
          message: `Your average glucose (${Math.round(avgGlucose)} mg/dL) is below target range`,
          confidence: 0.85,
          data: { avgGlucose, targetMin, targetMax },
        });
      } else if (avgGlucose > targetMax) {
        insights.push({
          type: "glucose_pattern",
          message: `Your average glucose (${Math.round(avgGlucose)} mg/dL) is above target range`,
          confidence: 0.85,
          data: { avgGlucose, targetMin, targetMax },
        });
      }
    }

    return insights;
  }

  /**
   * Calculate glucose patterns if blood glucose data is available
   */
  static calculateGlucosePatterns(injections: InjectionEnhanced[]) {
    const mealTypes = ["breakfast", "lunch", "dinner", "snack"];
    const beforeMeal: Record<string, number[]> = {};
    const afterMeal: Record<string, number[]> = {};

    mealTypes.forEach((meal) => {
      beforeMeal[meal] = [];
      afterMeal[meal] = [];
    });

    // Collect glucose readings by meal type
    injections.forEach((injection) => {
      if (injection.mealType && injection.bloodGlucoseBefore) {
        beforeMeal[injection.mealType].push(injection.bloodGlucoseBefore);
      }
      if (injection.mealType && injection.bloodGlucoseAfter) {
        afterMeal[injection.mealType].push(injection.bloodGlucoseAfter);
      }
    });

    // Calculate averages
    const avgBefore: Record<string, number> = {};
    const avgAfter: Record<string, number> = {};

    mealTypes.forEach((meal) => {
      if (beforeMeal[meal].length > 0) {
        avgBefore[meal] = beforeMeal[meal].reduce((a, b) => a + b, 0) / beforeMeal[meal].length;
      }
      if (afterMeal[meal].length > 0) {
        avgAfter[meal] = afterMeal[meal].reduce((a, b) => a + b, 0) / afterMeal[meal].length;
      }
    });

    // Calculate time in range (70-180 mg/dL)
    const allReadings = [
      ...injections.filter((i) => i.bloodGlucoseBefore).map((i) => i.bloodGlucoseBefore!),
      ...injections.filter((i) => i.bloodGlucoseAfter).map((i) => i.bloodGlucoseAfter!),
    ];

    const inRangeCount = allReadings.filter((reading) => reading >= 70 && reading <= 180).length;
    const timeInRange = allReadings.length > 0 ? (inRangeCount / allReadings.length) * 100 : 0;

    return {
      averageBeforeMeal: avgBefore,
      averageAfterMeal: avgAfter,
      timeInRange: Math.round(timeInRange * 10) / 10,
    };
  }

  /**
   * Perform complete advanced analytics
   */
  static async performAnalytics(
    injections: InjectionEnhanced[],
    daysToAnalyze: number = 30,
  ): Promise<AdvancedAnalytics> {
    const timePatterns = AnalyticsCalculator.calculateTimePatterns(injections);
    const dayOfWeekPatterns = AnalyticsCalculator.calculateDayOfWeekPatterns(
      injections,
      daysToAnalyze,
    );
    const complianceTrends = AnalyticsCalculator.calculateComplianceTrends(
      injections,
      daysToAnalyze,
    );
    const insights = AnalyticsCalculator.generateInsights(
      injections,
      timePatterns,
      dayOfWeekPatterns,
    );
    const glucosePatterns = AnalyticsCalculator.calculateGlucosePatterns(injections);

    return {
      timePatterns,
      dayOfWeekPatterns,
      complianceTrends,
      insights,
      glucosePatterns:
        Object.keys(glucosePatterns.averageBeforeMeal).length > 0 ? glucosePatterns : undefined,
    };
  }
}
