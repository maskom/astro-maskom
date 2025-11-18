-- Health Check Performance Migration
-- Adds missing indexes to improve health check endpoint performance

-- Index for health check queries on security audit logs
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp_health 
ON security_audit_logs(timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '7 days';

-- Index for user session health checks
CREATE INDEX IF NOT EXISTS idx_user_sessions_health_check 
ON user_sessions(user_id, is_active, expires_at) 
WHERE is_active = true;

-- Index for bandwidth monitoring health checks
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_health_check 
ON bandwidth_usage(user_id, usage_date DESC) 
WHERE usage_date >= NOW() - INTERVAL '30 days';

-- Add a simple health check metrics table for monitoring
CREATE TABLE IF NOT EXISTS health_check_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Index for health check metrics
CREATE INDEX IF NOT EXISTS idx_health_check_metrics_endpoint_timestamp 
ON health_check_metrics(endpoint, timestamp DESC);

-- Function to clean up old health check metrics (keep only last 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM health_check_metrics 
  WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the health check optimizations
COMMENT ON TABLE health_check_metrics IS 'Stores health check metrics for monitoring and observability';
COMMENT ON FUNCTION cleanup_old_health_metrics() IS 'Cleans up health check metrics older than 24 hours';