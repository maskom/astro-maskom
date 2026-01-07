// Service monitoring and health check types

export interface ServiceUptime {
  service_id: string;
  uptime_percentage: number;
  last_check: string;
  status: 'operational' | 'degraded' | 'outage';
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    storage: boolean;
    functions: boolean;
    kv: boolean;
  };
  details?: Record<string, unknown>;
}

// KV namespace types for Cloudflare Workers
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<{ keys: Array<{ name: string }> }>;
}

declare global {
  var SESSION: KVNamespace | undefined;
}
