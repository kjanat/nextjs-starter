/**
 * Environment configuration interface
 */
export interface EnvConfig {
  NODE_ENV: "development" | "test" | "production";
  DB?: unknown;
  RATE_LIMIT?: unknown;
  ALLOWED_ORIGINS: string;
  ENABLE_ANALYTICS: boolean;
  ENABLE_DEBUG_LOGGING: boolean;
}

/**
 * Runtime configuration interface
 */
export interface RuntimeConfig {
  api: {
    timeout: number;
    retryCount: number;
    retryDelay: number;
  };
  auth: {
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  ui: {
    animationDuration: number;
    debounceDelay: number;
    toastDuration: number;
  };
  features: {
    enableAnalytics: boolean;
    enableDebugLogging: boolean;
    enableOfflineMode: boolean;
  };
}

/**
 * Validation error class
 */
class ConfigValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Configuration validation failed:\n${errors.join("\n")}`);
    this.name = "ConfigValidationError";
  }
}

/**
 * Validates environment variables
 */
export function validateEnv(): EnvConfig {
  const errors: string[] = [];
  const env = process.env;

  // Validate NODE_ENV
  const nodeEnv = env.NODE_ENV || "development";
  if (!["development", "test", "production"].includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: development, test, production. Got: ${nodeEnv}`);
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return {
    NODE_ENV: nodeEnv as "development" | "test" | "production",
    DB: (globalThis as unknown as { DB?: unknown }).DB,
    RATE_LIMIT: (globalThis as unknown as { RATE_LIMIT?: unknown }).RATE_LIMIT,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS || "*",
    ENABLE_ANALYTICS: env.ENABLE_ANALYTICS === "true",
    ENABLE_DEBUG_LOGGING: env.ENABLE_DEBUG_LOGGING === "true",
  };
}

/**
 * Validates runtime configuration
 */
export function validateRuntimeConfig(config: unknown): RuntimeConfig {
  const errors: string[] = [];

  if (!config || typeof config !== "object" || config === null) {
    errors.push("Configuration must be an object");
    throw new ConfigValidationError(errors);
  }

  const cfg = config as Record<string, unknown>;

  // Validate API config
  if (!cfg.api || typeof cfg.api !== "object" || cfg.api === null) {
    errors.push("api configuration is required");
  } else {
    const api = cfg.api as Record<string, unknown>;
    if (
      !Number.isInteger(api.timeout) ||
      (api.timeout as number) < 1000 ||
      (api.timeout as number) > 60000
    ) {
      errors.push("api.timeout must be between 1000 and 60000");
    }
    if (
      !Number.isInteger(api.retryCount) ||
      (api.retryCount as number) < 0 ||
      (api.retryCount as number) > 5
    ) {
      errors.push("api.retryCount must be between 0 and 5");
    }
    if (
      !Number.isInteger(api.retryDelay) ||
      (api.retryDelay as number) < 100 ||
      (api.retryDelay as number) > 5000
    ) {
      errors.push("api.retryDelay must be between 100 and 5000");
    }
  }

  // Validate Auth config
  if (!cfg.auth || typeof cfg.auth !== "object" || cfg.auth === null) {
    errors.push("auth configuration is required");
  } else {
    const auth = cfg.auth as Record<string, unknown>;
    if (
      !Number.isInteger(auth.sessionTimeout) ||
      (auth.sessionTimeout as number) < 300 ||
      (auth.sessionTimeout as number) > 86400
    ) {
      errors.push("auth.sessionTimeout must be between 300 and 86400");
    }
    if (
      !Number.isInteger(auth.maxLoginAttempts) ||
      (auth.maxLoginAttempts as number) < 1 ||
      (auth.maxLoginAttempts as number) > 10
    ) {
      errors.push("auth.maxLoginAttempts must be between 1 and 10");
    }
  }

  // Validate UI config
  if (!cfg.ui || typeof cfg.ui !== "object" || cfg.ui === null) {
    errors.push("ui configuration is required");
  } else {
    const ui = cfg.ui as Record<string, unknown>;
    if (
      !Number.isInteger(ui.animationDuration) ||
      (ui.animationDuration as number) < 0 ||
      (ui.animationDuration as number) > 1000
    ) {
      errors.push("ui.animationDuration must be between 0 and 1000");
    }
    if (
      !Number.isInteger(ui.debounceDelay) ||
      (ui.debounceDelay as number) < 0 ||
      (ui.debounceDelay as number) > 1000
    ) {
      errors.push("ui.debounceDelay must be between 0 and 1000");
    }
    if (
      !Number.isInteger(ui.toastDuration) ||
      (ui.toastDuration as number) < 1000 ||
      (ui.toastDuration as number) > 10000
    ) {
      errors.push("ui.toastDuration must be between 1000 and 10000");
    }
  }

  // Validate Features config
  if (!cfg.features || typeof cfg.features !== "object" || cfg.features === null) {
    errors.push("features configuration is required");
  } else {
    const features = cfg.features as Record<string, unknown>;
    if (typeof features.enableAnalytics !== "boolean") {
      errors.push("features.enableAnalytics must be a boolean");
    }
    if (typeof features.enableDebugLogging !== "boolean") {
      errors.push("features.enableDebugLogging must be a boolean");
    }
    if (typeof features.enableOfflineMode !== "boolean") {
      errors.push("features.enableOfflineMode must be a boolean");
    }
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return cfg as unknown as RuntimeConfig;
}

/**
 * Creates a validated configuration object
 */
export function createConfig(): RuntimeConfig {
  const env = validateEnv();

  return {
    api: {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    },
    auth: {
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
    },
    ui: {
      animationDuration: 200,
      debounceDelay: 300,
      toastDuration: 5000,
    },
    features: {
      enableAnalytics: env.ENABLE_ANALYTICS,
      enableDebugLogging: env.ENABLE_DEBUG_LOGGING,
      enableOfflineMode: false,
    },
  };
}

/**
 * Singleton config instance
 */
let configInstance: RuntimeConfig | null = null;

export function getConfig(): RuntimeConfig {
  if (!configInstance) {
    configInstance = createConfig();
  }
  return configInstance;
}
