-- Performance Optimization Migration
-- Additional indexes for frequently queried columns
-- Migration: 20251118_performance_optimization.sql

-- Security audit logs missing indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_timestamp ON security_audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action_timestamp ON security_audit_logs(action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_level_timestamp ON security_audit_logs(risk_level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_timestamp ON security_audit_logs(ip_address, timestamp DESC);

-- Security events missing indexes  
CREATE INDEX IF NOT EXISTS idx_security_events_type_timestamp ON security_events(type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp ON security_events(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp ON security_events(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_resolved_timestamp ON security_events(resolved, timestamp DESC);

-- Security alerts missing indexes
CREATE INDEX IF NOT EXISTS idx_security_alerts_event_id ON security_alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity_timestamp ON security_alerts(severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged ON security_alerts(acknowledged, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_timestamp ON security_alerts(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_date_total ON bandwidth_usage(user_id, usage_date DESC, total_bytes DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status_created ON payment_transactions(user_id, status DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status_due ON invoices(user_id, status DESC, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_outage_events_status_created ON outage_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outage_notifications_user_status_sent ON outage_notifications(user_id, status, sent_at DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_pending ON payment_transactions(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices(due_date, created_at) WHERE status = 'overdue';
CREATE INDEX IF NOT EXISTS idx_outage_events_active ON outage_events(created_at DESC) WHERE status IN ('investigating', 'identified', 'monitoring');
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(timestamp DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_security_alerts_unacknowledged ON security_alerts(timestamp DESC) WHERE acknowledged = false;

-- JSONB indexes for metadata queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_metadata_gin ON payment_transactions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_details_gin ON security_audit_logs USING GIN(details);
CREATE INDEX IF NOT EXISTS idx_security_events_metadata_gin ON security_events USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_security_alerts_metadata_gin ON security_alerts USING GIN(metadata);

-- Text search indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_outage_events_title_gin ON outage_events USING GIN(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_outage_events_description_gin ON outage_events USING GIN(to_tsvector('english', description));

-- Function-based indexes for common calculations
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_usage_gb ON bandwidth_usage((total_bytes / (1024.0 * 1024.0 * 1024.0)));
CREATE INDEX IF NOT EXISTS idx_data_caps_usage_percentage ON data_caps((current_usage_gb / monthly_cap_gb * 100)) WHERE monthly_cap_gb > 0;

-- Covering indexes to eliminate table lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_covering ON payment_transactions(user_id, status, created_at) INCLUDE (order_id, amount);
CREATE INDEX IF NOT EXISTS idx_invoices_covering ON invoices(user_id, status, due_date) INCLUDE (invoice_number, total);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_covering ON security_audit_logs(user_id, timestamp DESC) INCLUDE (action, risk_level, success);

-- Comments for documentation
COMMENT ON INDEX idx_security_audit_logs_user_timestamp IS 'Optimizes user security history queries';
COMMENT ON INDEX idx_security_events_type_timestamp IS 'Optimizes security event type filtering';
COMMENT ON INDEX idx_payment_transactions_pending IS 'Optimizes pending transaction lookups';
COMMENT ON INDEX idx_outage_events_active IS 'Optimizes active outage queries';
COMMENT ON INDEX idx_bandwidth_usage_usage_gb IS 'Optimizes bandwidth usage in GB queries';