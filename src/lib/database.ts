import { getCloudflareContext } from "@opennextjs/cloudflare";
import { API_ERROR_CODES, ApiError } from "@/types/api";

export interface QueryResult<T> {
	results: T[];
	meta: {
		duration: number;
		rows_read: number;
		rows_written: number;
	};
}

export interface PreparedStatement<T = unknown> {
	bind(...values: unknown[]): PreparedStatement<T>;
	first(): Promise<T | null>;
	all(): Promise<QueryResult<T>>;
	run(): Promise<{ meta: { last_row_id: number } }>;
}

export interface Database {
	prepare(query: string): PreparedStatement;
	batch<T>(statements: PreparedStatement[]): Promise<T[]>;
}

interface QueryCacheEntry {
	data: unknown;
	timestamp: number;
	hits: number;
}

/**
 * Database wrapper with error handling, query logging, and caching
 */
export class DatabaseService {
	private static instance: DatabaseService | null = null;
	private queryCache = new Map<string, QueryCacheEntry>();
	private preparedStatements = new Map<string, PreparedStatement>();
	private readonly CACHE_TTL = 5000; // 5 seconds cache for read queries
	private readonly MAX_CACHE_SIZE = 100;
	private readonly MAX_PREPARED_STATEMENTS = 50;

	static async getInstance(): Promise<DatabaseService> {
		if (!DatabaseService.instance) {
			DatabaseService.instance = new DatabaseService();
		}
		return DatabaseService.instance;
	}

	/**
	 * Clear expired cache entries
	 */
	private clearExpiredCache(): void {
		const now = Date.now();
		for (const [key, entry] of this.queryCache.entries()) {
			if (now - entry.timestamp > this.CACHE_TTL) {
				this.queryCache.delete(key);
			}
		}
	}

	/**
	 * Get or create a prepared statement
	 */
	private async getPreparedStatement(sql: string): Promise<PreparedStatement> {
		if (this.preparedStatements.has(sql)) {
			return this.preparedStatements.get(sql)!;
		}

		const { env } = await getCloudflareContext();
		const statement = env.DB.prepare(sql);

		// Limit prepared statements cache size
		if (this.preparedStatements.size >= this.MAX_PREPARED_STATEMENTS) {
			const firstKey = this.preparedStatements.keys().next().value;
			if (firstKey !== undefined) {
				this.preparedStatements.delete(firstKey);
			}
		}

		this.preparedStatements.set(sql, statement);
		return statement;
	}

	/**
	 * Generate cache key from SQL and params
	 */
	private getCacheKey(sql: string, params: unknown[]): string {
		return `${sql}::${JSON.stringify(params)}`;
	}

	/**
	 * Executes a query and returns all results
	 */
	async query<T>(sql: string, params: unknown[] = [], useCache = true): Promise<T[]> {
		// Check cache for read queries
		if (useCache && sql.trim().toUpperCase().startsWith("SELECT")) {
			this.clearExpiredCache();
			const cacheKey = this.getCacheKey(sql, params);
			const cached = this.queryCache.get(cacheKey);

			if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
				cached.hits++;
				if (process.env.NODE_ENV === "development") {
					console.log(`[DB Cache Hit] ${sql}`, { hits: cached.hits });
				}
				return cached.data as T[];
			}
		}

		try {
			const statement = await this.getPreparedStatement(sql);
			const boundStatement = params.length > 0 ? statement.bind(...params) : statement;
			const result = await boundStatement.all();

			if (process.env.NODE_ENV === "development") {
				console.log(`[DB Query] ${sql}`, {
					params,
					rowsReturned: result.results.length,
					duration: result.meta.duration,
				});
			}

			// Cache the result for read queries
			if (useCache && sql.trim().toUpperCase().startsWith("SELECT")) {
				const cacheKey = this.getCacheKey(sql, params);

				// Limit cache size
				if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
					// Remove least recently used entry
					const oldestKey = Array.from(this.queryCache.entries()).sort(
						(a, b) => a[1].timestamp - b[1].timestamp,
					)[0][0];
					this.queryCache.delete(oldestKey);
				}

				this.queryCache.set(cacheKey, {
					data: result.results,
					timestamp: Date.now(),
					hits: 0,
				});
			}

			return result.results as T[];
		} catch (error) {
			this.handleDatabaseError(error, sql);
		}
	}

	/**
	 * Executes a query and returns the first result
	 */
	async queryFirst<T>(sql: string, params: unknown[] = [], useCache = true): Promise<T | null> {
		// Check cache for read queries
		if (useCache && sql.trim().toUpperCase().startsWith("SELECT")) {
			this.clearExpiredCache();
			const cacheKey = `first:${this.getCacheKey(sql, params)}`;
			const cached = this.queryCache.get(cacheKey);

			if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
				cached.hits++;
				if (process.env.NODE_ENV === "development") {
					console.log(`[DB Cache Hit First] ${sql}`, { hits: cached.hits });
				}
				return cached.data as T | null;
			}
		}

		try {
			const statement = await this.getPreparedStatement(sql);
			const boundStatement = params.length > 0 ? statement.bind(...params) : statement;
			const result = await boundStatement.first();

			if (process.env.NODE_ENV === "development") {
				console.log(`[DB QueryFirst] ${sql}`, {
					params,
					found: result !== null,
				});
			}

			// Cache the result for read queries
			if (useCache && sql.trim().toUpperCase().startsWith("SELECT")) {
				const cacheKey = `first:${this.getCacheKey(sql, params)}`;
				this.queryCache.set(cacheKey, {
					data: result,
					timestamp: Date.now(),
					hits: 0,
				});
			}

			return result as T | null;
		} catch (error) {
			this.handleDatabaseError(error, sql);
		}
	}

	/**
	 * Executes a mutation query (INSERT, UPDATE, DELETE)
	 */
	async execute(
		sql: string,
		params: unknown[] = [],
	): Promise<{ lastRowId?: number; changes: number }> {
		try {
			const statement = await this.getPreparedStatement(sql);
			const boundStatement = params.length > 0 ? statement.bind(...params) : statement;
			const result = await boundStatement.run();

			// Invalidate cache after mutations
			this.invalidateCache();

			if (process.env.NODE_ENV === "development") {
				console.log(`[DB Execute] ${sql}`, {
					params,
					lastRowId: result.meta.last_row_id,
				});
			}

			return {
				lastRowId: result.meta.last_row_id,
				changes: 1, // D1 doesn't provide changes count
			};
		} catch (error) {
			this.handleDatabaseError(error, sql);
		}
	}

	/**
	 * Invalidate all cached queries
	 */
	private invalidateCache(): void {
		this.queryCache.clear();
		if (process.env.NODE_ENV === "development") {
			console.log("[DB Cache] Cache invalidated after mutation");
		}
	}

	/**
	 * Execute multiple statements in a batch
	 */
	async batch<T = unknown>(operations: Array<{ sql: string; params?: unknown[] }>): Promise<T[]> {
		const { env } = await getCloudflareContext();
		const statements: PreparedStatement[] = [];

		try {
			for (const op of operations) {
				const statement = await this.getPreparedStatement(op.sql);
				const boundStatement = op.params?.length ? statement.bind(...op.params) : statement;
				statements.push(boundStatement);
			}

			const results = await env.DB.batch(
				statements as unknown as Parameters<typeof env.DB.batch>[0],
			);

			// Invalidate cache after batch operations
			this.invalidateCache();

			if (process.env.NODE_ENV === "development") {
				console.log(`[DB Batch] Executed ${operations.length} operations`);
			}

			return results as T[];
		} catch (error) {
			this.handleDatabaseError(error, "BATCH");
		}
	}

	/**
	 * Executes multiple queries in a transaction
	 */
	async transaction<T>(callback: (db: DatabaseService) => Promise<T>): Promise<T> {
		try {
			// Note: D1 doesn't support explicit transactions yet
			// This is a placeholder for when it does
			return await callback(this);
		} catch (error) {
			this.handleDatabaseError(error, "TRANSACTION");
		}
	}

	/**
	 * Handles database errors and throws standardized ApiError
	 */
	private handleDatabaseError(error: unknown, sql: string): never {
		console.error("Database error:", error, "SQL:", sql);

		if (error instanceof Error) {
			// Check for specific database errors
			if (error.message.includes("UNIQUE constraint failed")) {
				throw new ApiError("Duplicate entry found", 409, API_ERROR_CODES.VALIDATION_ERROR);
			}

			if (error.message.includes("no such table")) {
				throw new ApiError("Database schema error", 500, API_ERROR_CODES.SERVER_ERROR);
			}
		}

		throw new ApiError("Database operation failed", 500, API_ERROR_CODES.SERVER_ERROR);
	}
}

/**
 * SQL query builder helpers
 */
export const SQL = {
	/**
	 * Safely escapes a table or column name
	 */
	identifier(name: string): string {
		return `"${name.replace(/"/g, '""')}"`;
	},

	/**
	 * Creates a parameterized IN clause
	 */
	in(count: number): string {
		return `(${Array(count).fill("?").join(", ")})`;
	},

	/**
	 * Creates a parameterized VALUES clause for INSERT
	 */
	values(columns: number): string {
		return `(${Array(columns).fill("?").join(", ")})`;
	},
};
