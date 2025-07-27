export const INJECTION_TYPE = {
  MORNING: "morning",
  EVENING: "evening",
} as const;

export type InjectionType = (typeof INJECTION_TYPE)[keyof typeof INJECTION_TYPE];

// Import the actual database types
import type { Injection as DBInjection, NewInjection as DBNewInjection } from "@/db/schema";

// Re-export the DB types as our main types
export type Injection = DBInjection;
export type NewInjection = DBNewInjection;

// Additional types for filtering
export interface InjectionFilters {
  userName?: string;
  date?: string | Date;
  startDate?: Date;
  endDate?: Date;
}

// Type for today's status
export interface TodayStatus {
  morning: boolean;
  evening: boolean;
  injections: Injection[];
}

export interface InjectionStats {
  totalInjections: number;
  morningInjections: number;
  eveningInjections: number;
  missedDoses: number;
  userStats: Readonly<Record<string, number>>;
  lastWeekCompliance: number;
}

export interface UserStats {
  username: string;
  injectionCount: number;
  percentage: number;
}
