export interface Injection {
	id?: number;
	user_name: string;
	injection_time: string;
	injection_type: "morning" | "evening";
	notes?: string;
	created_at?: string;
}

export interface InjectionStats {
	totalInjections: number;
	morningInjections: number;
	eveningInjections: number;
	missedDoses: number;
	userStats: Record<string, number>;
	lastWeekCompliance: number;
}
