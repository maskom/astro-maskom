-- Performance Optimization Migration
-- This migration adds additional indexes for improved query performance
-- based on common query patterns identified in the application

-- Additional indexes for security tables (frequently queried for audit logs)
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_timestamp 
    ON security_audit_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action_timestamp 
    ON security_audit_logs(action, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_level_timestamp 
    ON security_audit_logs(risk_level, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_timestamp 
    ON security_audit_logs(ip_address, timestamp DESC);

-- Additional indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type_timestamp 
    ON security_events(type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_severity_timestamp 
    ON security_events(severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp 
    ON security_events(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_security_events_resolved_timestamp 
    ON security_events(resolved, timestamp DESC);

-- Additional indexes for security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity_timestamp 
    ON security_alerts(severity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged_timestamp 
    ON security_alerts(acknowledged, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_timestamp 
    ON security_alerts(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- Composite indexes for bandwidth monitoring (common date range queries)
CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_user_date_range 
    ON bandwidth_usage(user_id, usage_date DESC, total_bytes DESC);

CREATE INDEX IF NOT EXISTS idx_bandwidth_usage_package_date 
    ON bandwidth_usage(package_id, usage_date DESC);

-- Additional indexes for payment transactions (common status/date queries)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status_date 
    ON payment_transactions(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status_created_date 
    ON payment_transactions(status, created_at DESC);

-- Additional indexes for invoices (overdue and status queries)
CREATE INDEX IF NOT EXISTS idx_invoices_user_status_due_date 
    ON invoices(user_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date 
    ON invoices(status, due_date) WHERE status IN ('sent', 'overdue');

-- Additional indexes for customer subscriptions (active status queries)
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_user_status_active 
    ON customer_subscriptions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status_end_date 
    ON customer_subscriptions(status, end_date) WHERE end_date IS NOT NULL;

-- Additional indexes for support tickets (priority and status queries)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority_created 
    ON support_tickets(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category_status_created 
    ON support_tickets(category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status 
    ON support_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Additional indexes for ticket messages (conversation queries)
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created 
    ON ticket_messages(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_internal_created 
    ON ticket_messages(is_internal, created_at DESC);

-- Additional indexes for service requests (status and date queries)
CREATE INDEX IF NOT EXISTS idx_service_requests_status_preferred_date 
    ON service_requests(status, preferred_date) WHERE preferred_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_type_status_created 
    ON service_requests(request_type, status, created_at DESC);

-- Additional indexes for usage monitoring (trend analysis)
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_user_subscription_date 
    ON usage_monitoring(user_id, subscription_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_monitoring_date_data_used 
    ON usage_monitoring(measurement_date DESC, data_used DESC);

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_pending 
    ON payment_transactions(created_at DESC) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_support_tickets_open_high_priority 
    ON support_tickets(created_at DESC) WHERE status = 'open' AND priority IN ('high', 'urgent');

CREATE INDEX IF NOT EXISTS idx_security_events_unresolved_high_severity 
    ON security_events(timestamp DESC) WHERE resolved = false AND severity IN ('high', 'critical');

-- Indexes for JSONB metadata queries (if commonly used)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_metadata_gin 
    ON payment_transactions USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_details_gin 
    ON security_audit_logs USING GIN(details);

CREATE INDEX IF NOT EXISTS idx_security_events_metadata_gin 
    ON security_events USING GIN(metadata);

-- Indexes for text search (if search functionality is used)
CREATE INDEX IF NOT EXISTS idx_support_tickets_subject_gin 
    ON support_tickets USING GIN(to_tsvector('english', subject));

CREATE INDEX IF NOT EXISTS idx_support_tickets_description_gin 
    ON support_tickets USING GIN(to_tsvector('english', description));

CREATE INDEX IF NOT EXISTS idx_ticket_messages_message_gin 
    ON ticket_messages USING GIN(to_tsvector('english', message));

-- Function to update table statistics for better query planning
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    -- Update statistics for frequently queried tables
    ANALYZE security_audit_logs;
    ANALYZE security_events;
    ANALYZE security_alerts;
    ANALYZE bandwidth_usage;
    ANALYZE payment_transactions;
    ANALYZE invoices;
    ANALYZE customer_subscriptions;
    ANALYZE support_tickets;
    ANALYZE ticket_messages;
    ANALYZE usage_monitoring;
    ANALYZE service_requests;
END;
$$ LANGUAGE plpgsql;

-- Comment explaining the purpose of these indexes
COMMENT ON FUNCTION update_table_statistics() IS 'Updates PostgreSQL statistics for optimal query planning on frequently accessed tables';

-- Create a scheduled job to update statistics (requires pg_cron extension)
-- Note: This will only work if pg_cron is enabled in the Supabase project
-- SELECT cron.schedule('update-stats', '0 2 * * *', 'SELECT update_table_statistics();');

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_metrics AS
SELECT 
    'security_audit_logs' as table_name,
    COUNT(*) as total_rows,
    MAX(timestamp) as latest_record,
    COUNT(CASE WHEN timestamp > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
FROM security_audit_logs
UNION ALL
SELECT 
    'bandwidth_usage' as table_name,
    COUNT(*) as total_rows,
    MAX(created_at) as latest_record,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
FROM bandwidth_usage
UNION ALL
SELECT 
    'payment_transactions' as table_name,
    COUNT(*) as total_rows,
    MAX(created_at) as latest_record,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
FROM payment_transactions
UNION ALL
SELECT 
    'support_tickets' as table_name,
    COUNT(*) as total_rows,
    MAX(created_at) as latest_record,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
FROM support_tickets;

COMMENT ON VIEW performance_metrics IS 'Provides overview of key table activity for monitoring and performance analysis';