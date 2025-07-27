/**
 * Edge-compatible in-memory cache with TTL support
 */
export class EdgeCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize = 100, defaultTTLSeconds = 300) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLSeconds * 1000; // Convert to milliseconds
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    // Enforce size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  todayStatus: (userName?: string) => `today-status:${userName || "all"}`,
  stats: (daysBack: number) => `stats:${daysBack}`,
  injections: (filters?: Record<string, unknown>) => `injections:${JSON.stringify(filters || {})}`,
} as const;

/**
 * Cache TTL values in seconds
 */
export const CacheTTL = {
  todayStatus: 60, // 1 minute
  stats: 300, // 5 minutes
  injections: 180, // 3 minutes
  healthCheck: 30, // 30 seconds
} as const;
