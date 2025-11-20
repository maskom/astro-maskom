-- Performance Optimization Migration
-- Adds additional indexes for common query patterns

-- Composite indexes for frequently queried combinations
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_timestamp 
ON security_audit_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action_timestamp 
ON security_audit_logs(action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp 
ON security_events(severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_resolved_timestamp 
ON security_events(resolved, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active_expires 
ON user_sessions(user_id, is_active, expires_at);

CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_date_total 
ON bandwidth_usage(user_id, usage_date DESC, total_bytes DESC);

CREATE INDEX IF NOT EXISTS idx_data_caps_user_active_cycle 
ON data_caps(user_id, is_active, billing_cycle_start);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status_created 
ON payment_transactions(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_user_status_due 
ON invoices(user_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_outage_notifications_user_status_sent 
ON outage_notifications(user_id, status, sent_at DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_recent 
ON security_audit_logs(timestamp DESC) 
WHERE timestamp >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_pending 
ON payment_transactions(created_at, user_id) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invoices_unpaid 
ON invoices(due_date, user_id) 
WHERE status IN ('draft', 'sent');

CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
ON user_sessions(user_id, last_activity DESC) 
WHERE is_active = true AND expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_outage_events_active 
ON outage_events(severity, created_at DESC) 
WHERE status != 'resolved';

-- Indexes for JSONB queries (if any)
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_details_gin 
ON security_audit_logs USING GIN(details);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_metadata_gin 
ON payment_transactions USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_data_caps_thresholds_gin 
ON data_caps USING GIN(notification_thresholds);

-- Function to update table statistics for better query planning
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  -- Update statistics for frequently queried tables
  ANALYZE security_audit_logs;
  ANALYZE security_events;
  ANALYZE user_sessions;
  ANALYZE bandwidth_usage;
  ANALYZE data_caps;
  ANALYZE payment_transactions;
  ANALYZE invoices;
  ANALYZE outage_events;
  ANALYZE outage_notifications;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the performance optimizations
COMMENT ON FUNCTION update_table_statistics() IS 'Updates PostgreSQL statistics for optimal query planning';