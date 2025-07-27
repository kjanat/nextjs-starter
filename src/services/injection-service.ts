import { APP_CONFIG } from "@/lib/constants";
import { DatabaseService } from "@/lib/database";
import { sanitizeNotes, sanitizeUserName, validateInjectionDataWithErrors } from "@/lib/validation";
import { API_ERROR_CODES, ApiError } from "@/types/api";
import type { Injection, InjectionStats, NewInjection } from "@/types/injection";
import { INJECTION_TYPE } from "@/types/injection";

export interface InjectionFilter {
  date?: string;
  userName?: string;
  type?: string;
}

export interface PaginatedInjections {
  injections: Injection[];
  total: number;
}

/**
 * Service class for handling injection-related database operations
 */
export class InjectionService {
  /**
   * Fetches injections with optional filters and pagination
   */
  static async getInjections(
    filters: InjectionFilter = {},
    page = 1,
    perPage = 20,
  ): Promise<PaginatedInjections> {
    const db = await DatabaseService.getInstance();

    // Build query with filters
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
        throw new ApiError(
          "Invalid date format. Expected YYYY-MM-DD",
          400,
          API_ERROR_CODES.VALIDATION_ERROR,
        );
      }
      conditions.push("DATE(injection_time) = DATE(?)");
      params.push(filters.date);
    }

    if (filters.userName) {
      conditions.push("user_name = ?");
      params.push(filters.userName);
    }

    if (filters.type) {
      if (filters.type !== INJECTION_TYPE.MORNING && filters.type !== INJECTION_TYPE.EVENING) {
        throw new ApiError("Invalid injection type", 400, API_ERROR_CODES.VALIDATION_ERROR);
      }
      conditions.push("injection_type = ?");
      params.push(filters.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * perPage;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM injections ${whereClause}`;
    const countResult = await db.queryFirst<{ total: number }>(countQuery, params);
    const total = countResult?.total || 0;

    // Get paginated results
    const dataQuery = `
			SELECT * FROM injections 
			${whereClause} 
			ORDER BY injection_time DESC 
			LIMIT ? OFFSET ?
		`;

    const injections = await db.query<Injection>(dataQuery, [...params, perPage, offset]);

    return {
      injections,
      total,
    };
  }

  /**
   * Creates a new injection
   */
  static async createInjection(data: unknown): Promise<Injection> {
    // Validate injection data
    const validation = validateInjectionDataWithErrors(data);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => `${e.field}: ${e.message}`).join(", ");
      throw new ApiError(
        `Validation failed: ${errorMessages}`,
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const db = await DatabaseService.getInstance();
    const injectionData = data as NewInjection;

    // Check for duplicate injection
    const isDuplicate = await InjectionService.checkDuplicateInjection(
      injectionData.user_name,
      injectionData.injection_type,
    );

    if (isDuplicate) {
      throw new ApiError(
        `${injectionData.injection_type} injection already logged for today`,
        409,
        API_ERROR_CODES.VALIDATION_ERROR,
      );
    }

    // Sanitize input
    const sanitizedData = {
      user_name: sanitizeUserName(injectionData.user_name),
      injection_time: injectionData.injection_time,
      injection_type: injectionData.injection_type,
      notes: sanitizeNotes(injectionData.notes),
    };

    try {
      const result = await db.execute(
        "INSERT INTO injections (user_name, injection_time, injection_type, notes) VALUES (?, ?, ?, ?)",
        [
          sanitizedData.user_name,
          sanitizedData.injection_time,
          sanitizedData.injection_type,
          sanitizedData.notes,
        ],
      );

      // Fetch the created injection
      const newInjection = await db.queryFirst<Injection>("SELECT * FROM injections WHERE id = ?", [
        result.lastRowId,
      ]);

      if (!newInjection) {
        throw new Error("Failed to retrieve created injection");
      }

      return newInjection;
    } catch (error) {
      console.error("Database error:", error);
      throw new ApiError("Failed to create injection", 500, API_ERROR_CODES.SERVER_ERROR);
    }
  }

  /**
   * Gets today's injection status
   */
  static async getTodayStatus() {
    const db = await DatabaseService.getInstance();
    const today = new Date().toISOString().split("T")[0];

    // Use a single optimized query with conditional aggregation
    const result = await db.queryFirst<{
      morning_injection: string | null;
      morning_time: string | null;
      morning_user: string | null;
      evening_injection: string | null;
      evening_time: string | null;
      evening_user: string | null;
    }>(
      `SELECT 
				MAX(CASE WHEN injection_type = ? THEN id END) as morning_injection,
				MAX(CASE WHEN injection_type = ? THEN injection_time END) as morning_time,
				MAX(CASE WHEN injection_type = ? THEN user_name END) as morning_user,
				MAX(CASE WHEN injection_type = ? THEN id END) as evening_injection,
				MAX(CASE WHEN injection_type = ? THEN injection_time END) as evening_time,
				MAX(CASE WHEN injection_type = ? THEN user_name END) as evening_user
			FROM injections 
			WHERE DATE(injection_time) = DATE(?)`,
      [
        INJECTION_TYPE.MORNING,
        INJECTION_TYPE.MORNING,
        INJECTION_TYPE.MORNING,
        INJECTION_TYPE.EVENING,
        INJECTION_TYPE.EVENING,
        INJECTION_TYPE.EVENING,
        today,
      ],
    );

    const morningDetails = result?.morning_injection
      ? {
          id: parseInt(result.morning_injection),
          injection_type: INJECTION_TYPE.MORNING,
          injection_time: result.morning_time!,
          user_name: result.morning_user!,
          notes: undefined,
          created_at: result.morning_time!,
        }
      : null;

    const eveningDetails = result?.evening_injection
      ? {
          id: parseInt(result.evening_injection),
          injection_type: INJECTION_TYPE.EVENING,
          injection_time: result.evening_time!,
          user_name: result.evening_user!,
          notes: undefined,
          created_at: result.evening_time!,
        }
      : null;

    return {
      date: today,
      morningDone: !!morningDetails,
      eveningDone: !!eveningDetails,
      morningDetails,
      eveningDetails,
      allComplete: !!morningDetails && !!eveningDetails,
    };
  }

  /**
   * Gets injection statistics
   */
  static async getStats(): Promise<InjectionStats> {
    const db = await DatabaseService.getInstance();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - APP_CONFIG.COMPLIANCE_DAYS);

    // Run optimized parallel queries
    const [totalResult, typeStatsResult, uniqueDosesResult, userStatsResult] = await Promise.all([
      // Get total count
      db.queryFirst<{ count: number }>(
        "SELECT COUNT(*) as count FROM injections WHERE injection_time >= ?",
        [sevenDaysAgo.toISOString()],
      ),

      // Get type distribution
      db.query<{ injection_type: string; count: number }>(
        `SELECT injection_type, COUNT(*) as count 
				 FROM injections 
				 WHERE injection_time >= ?
				 GROUP BY injection_type`,
        [sevenDaysAgo.toISOString()],
      ),

      // Get unique doses (date + type combinations)
      db.queryFirst<{ unique_doses: number }>(
        `SELECT COUNT(DISTINCT DATE(injection_time) || '-' || injection_type) as unique_doses
				 FROM injections
				 WHERE injection_time >= ?`,
        [sevenDaysAgo.toISOString()],
      ),

      // Get user statistics
      db.query<{ user_name: string; count: number }>(
        `SELECT user_name, COUNT(*) as count 
				 FROM injections 
				 WHERE injection_time >= ?
				 GROUP BY user_name
				 ORDER BY count DESC`,
        [sevenDaysAgo.toISOString()],
      ),
    ]);

    // Process results
    const totalInjections = totalResult?.count || 0;

    const typeStats = { morning: 0, evening: 0 };
    typeStatsResult.forEach((row) => {
      if (row.injection_type === INJECTION_TYPE.MORNING) {
        typeStats.morning = row.count;
      } else if (row.injection_type === INJECTION_TYPE.EVENING) {
        typeStats.evening = row.count;
      }
    });

    // Calculate compliance
    const expectedDoses = APP_CONFIG.COMPLIANCE_DAYS * APP_CONFIG.DOSES_PER_DAY;
    const actualDoses = uniqueDosesResult?.unique_doses || 0;
    const missedDoses = Math.max(0, expectedDoses - actualDoses);
    const lastWeekCompliance =
      expectedDoses > 0 ? Math.round((actualDoses / expectedDoses) * 100) : 0;

    // Build user stats object
    const userStats: Record<string, number> = {};
    userStatsResult.forEach((row) => {
      userStats[row.user_name] = row.count;
    });

    return {
      totalInjections,
      morningInjections: typeStats.morning,
      eveningInjections: typeStats.evening,
      missedDoses,
      userStats,
      lastWeekCompliance,
    };
  }

  /**
   * Checks if an injection already exists for today
   */
  private static async checkDuplicateInjection(userName: string, type: string): Promise<boolean> {
    const db = await DatabaseService.getInstance();
    const today = new Date().toISOString().split("T")[0];

    const result = await db.queryFirst<{ count: number }>(
      "SELECT COUNT(*) as count FROM injections WHERE user_name = ? AND injection_type = ? AND DATE(injection_time) = DATE(?)",
      [userName, type, today],
    );

    return (result?.count || 0) > 0;
  }
}
