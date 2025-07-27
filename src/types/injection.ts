export const INJECTION_TYPE = {
  MORNING: "morning",
  EVENING: "evening",
} as const;

export type InjectionType = (typeof INJECTION_TYPE)[keyof typeof INJECTION_TYPE];

export interface BaseInjection {
  user_name: string;
  injection_time: string;
  injection_type: InjectionType;
  notes?: string;
}

export interface Injection extends BaseInjection {
  id: number;
  created_at: string;
}

export interface NewInjection extends BaseInjection {
  id?: never;
  created_at?: never;
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
