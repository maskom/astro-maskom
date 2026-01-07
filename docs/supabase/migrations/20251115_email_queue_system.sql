-- Email Queue System Schema
-- This migration creates the tables and functions needed for a robust email queue system

-- Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL DEFAULT 'noreply@maskom.network',
    subject TEXT NOT NULL,
    content_html TEXT,
    content_text TEXT,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    template_data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest, 10 = lowest
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'sent', 'failed', 'cancelled', 'retry'
    )),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    category VARCHAR(100) DEFAULT 'transactional' CHECK (category IN (
        'transactional', 'marketing', 'notification', 'system'
    )),
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Delivery Logs Table
CREATE TABLE IF NOT EXISTS email_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES email_queue(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'queued', 'sent', 'delivered', 'bounced', 'complained', 'rejected', 'failed'
    )),
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    response_code VARCHAR(50),
    response_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Email Queue Settings Table (for configuration)
CREATE TABLE IF NOT EXISTS email_queue_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email_queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status IN ('retry', 'pending');
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_to_email ON email_queue(to_email);

-- Indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- Indexes for email_delivery_logs
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_email_id ON email_delivery_logs(email_id);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_event_type ON email_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_delivery_logs_processed_at ON email_delivery_logs(processed_at);

-- Row Level Security (RLS) Policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_queue (service access only)
CREATE POLICY "Service accounts can manage email queue"
    ON email_queue FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- RLS Policies for email_templates
CREATE POLICY "Service accounts can manage email templates"
    ON email_templates FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- RLS Policies for email_delivery_logs
CREATE POLICY "Service accounts can manage email delivery logs"
    ON email_delivery_logs FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- RLS Policies for email_queue_settings
CREATE POLICY "Service accounts can manage email queue settings"
    ON email_queue_settings FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_email_queue_updated_at 
    BEFORE UPDATE ON email_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_settings_updated_at 
    BEFORE UPDATE ON email_queue_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next retry time with exponential backoff
CREATE OR REPLACE FUNCTION calculate_next_retry(attempt_number INTEGER)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Exponential backoff: 5min, 15min, 45min, 2h, 6h, 12h, 24h
    CASE attempt_number
        WHEN 1 THEN RETURN NOW() + INTERVAL '5 minutes';
        WHEN 2 THEN RETURN NOW() + INTERVAL '15 minutes';
        WHEN 3 THEN RETURN NOW() + INTERVAL '45 minutes';
        WHEN 4 THEN RETURN NOW() + INTERVAL '2 hours';
        WHEN 5 THEN RETURN NOW() + INTERVAL '6 hours';
        WHEN 6 THEN RETURN NOW() + INTERVAL '12 hours';
        ELSE RETURN NOW() + INTERVAL '24 hours';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to add email to queue
CREATE OR REPLACE FUNCTION add_email_to_queue(
    p_to_email VARCHAR(255),
    p_from_email VARCHAR(255) DEFAULT 'noreply@maskom.network',
    p_subject TEXT,
    p_content_html TEXT DEFAULT NULL,
    p_content_text TEXT DEFAULT NULL,
    p_template_id UUID DEFAULT NULL,
    p_template_data JSONB DEFAULT '{}',
    p_priority INTEGER DEFAULT 5,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_email_id UUID;
BEGIN
    INSERT INTO email_queue (
        to_email,
        from_email,
        subject,
        content_html,
        content_text,
        template_id,
        template_data,
        priority,
        metadata
    ) VALUES (
        p_to_email,
        p_from_email,
        p_subject,
        p_content_html,
        p_content_text,
        p_template_id,
        p_template_data,
        p_priority,
        p_metadata
    ) RETURNING id INTO v_email_id;
    
    -- Log queuing event
    INSERT INTO email_delivery_logs (email_id, event_type, metadata)
    VALUES (v_email_id, 'queued', p_metadata);
    
    RETURN v_email_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process email queue
CREATE OR REPLACE FUNCTION process_email_queue(batch_size INTEGER DEFAULT 10)
RETURNS TABLE(processed_count INTEGER, failed_count INTEGER) AS $$
DECLARE
    v_email_record RECORD;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
    v_should_retry BOOLEAN := FALSE;
BEGIN
    -- Get pending emails ordered by priority and creation time
    FOR v_email_record IN 
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
           OR (status = 'retry' AND next_retry_at <= NOW())
        ORDER BY priority ASC, created_at ASC
        LIMIT batch_size
    LOOP
        -- Update status to processing
        UPDATE email_queue 
        SET 
            status = 'processing',
            last_attempt_at = NOW(),
            attempts = attempts + 1
        WHERE id = v_email_record.id;
        
        BEGIN
            -- Here we would integrate with the actual email service
            -- For now, we'll simulate the sending process
            
            -- Simulate email sending (replace with actual email service call)
            IF v_email_record.attempts < v_email_record.max_attempts THEN
                -- Simulate success (90% success rate for demo)
                IF RANDOM() > 0.1 THEN
                    -- Success
                    UPDATE email_queue 
                    SET 
                        status = 'sent',
                        sent_at = NOW()
                    WHERE id = v_email_record.id;
                    
                    -- Log successful delivery
                    INSERT INTO email_delivery_logs (
                        email_id, 
                        event_type, 
                        provider_message_id, 
                        metadata
                    ) VALUES (
                        v_email_record.id,
                        'sent',
                        'msg_' || gen_random_uuid(),
                        jsonb_build_object('attempt', v_email_record.attempts + 1)
                    );
                    
                    v_processed := v_processed + 1;
                ELSE
                    -- Simulate failure
                    v_should_retry := v_email_record.attempts + 1 < v_email_record.max_attempts;
                    
                    UPDATE email_queue 
                    SET 
                        status = CASE WHEN v_should_retry THEN 'retry' ELSE 'failed' END,
                        next_retry_at = CASE WHEN v_should_retry THEN calculate_next_retry(v_email_record.attempts + 1) ELSE NULL END,
                        error_message = 'Simulated sending failure'
                    WHERE id = v_email_record.id;
                    
                    -- Log failure
                    INSERT INTO email_delivery_logs (
                        email_id, 
                        event_type, 
                        response_message, 
                        metadata
                    ) VALUES (
                        v_email_record.id,
                        'failed',
                        'Simulated sending failure',
                        jsonb_build_object('attempt', v_email_record.attempts + 1, 'will_retry', v_should_retry)
                    );
                    
                    IF v_should_retry THEN
                        v_processed := v_processed + 1; -- Will be retried
                    ELSE
                        v_failed := v_failed + 1; -- Permanently failed
                    END IF;
                END IF;
            ELSE
                -- Max attempts reached
                UPDATE email_queue 
                SET 
                    status = 'failed',
                    error_message = 'Maximum attempts reached'
                WHERE id = v_email_record.id;
                
                v_failed := v_failed + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle unexpected errors
            v_should_retry := v_email_record.attempts + 1 < v_email_record.max_attempts;
            
            UPDATE email_queue 
            SET 
                status = CASE WHEN v_should_retry THEN 'retry' ELSE 'failed' END,
                next_retry_at = CASE WHEN v_should_retry THEN calculate_next_retry(v_email_record.attempts + 1) ELSE NULL END,
                error_message = SQLERRM
            WHERE id = v_email_record.id;
            
            -- Log error
            INSERT INTO email_delivery_logs (
                email_id, 
                event_type, 
                response_message, 
                metadata
            ) VALUES (
                v_email_record.id,
                'failed',
                SQLERRM,
                jsonb_build_object('attempt', v_email_record.attempts + 1, 'error_code', SQLSTATE)
            );
            
            IF NOT v_should_retry THEN
                v_failed := v_failed + 1;
            END IF;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_failed;
END;
$$ LANGUAGE plpgsql;

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_email_queue_stats()
RETURNS TABLE(
    pending_count BIGINT,
    processing_count BIGINT,
    sent_today BIGINT,
    failed_today BIGINT,
    retry_count BIGINT,
    avg_delivery_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM email_queue WHERE status = 'pending'),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'processing'),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'failed' AND DATE(updated_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM email_queue WHERE status = 'retry'),
        (SELECT AVG(sent_at - created_at) FROM email_queue WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Insert default email queue settings
INSERT INTO email_queue_settings (key, value, description) VALUES
('max_batch_size', '50', 'Maximum number of emails to process in one batch'),
('retry_delay_minutes', '5', 'Initial retry delay in minutes'),
('max_retry_attempts', '3', 'Maximum number of retry attempts'),
('rate_limit_per_minute', '10', 'Maximum emails per minute'),
('queue_processing_interval_seconds', '60', 'Queue processing interval in seconds')
ON CONFLICT (key) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, description, subject_template, html_template, text_template, category) VALUES
('welcome_email', 'Welcome email for new users', 'Welcome to Maskom Network!', 
'<h1>Welcome to Maskom Network!</h1><p>Thank you for joining us. Your account has been successfully created.</p>',
'Welcome to Maskom Network!\n\nThank you for joining us. Your account has been successfully created.',
'transactional'),
('payment_confirmation', 'Payment confirmation email', 'Payment Confirmation - Order #{{order_id}}',
'<h1>Payment Confirmation</h1><p>Your payment of {{amount}} {{currency}} has been successfully processed.</p><p>Order ID: {{order_id}}</p>',
'Payment Confirmation\n\nYour payment of {{amount}} {{currency}} has been successfully processed.\n\nOrder ID: {{order_id}}',
'transactional'),
('password_reset', 'Password reset email', 'Reset Your Password',
'<h1>Reset Your Password</h1><p>Click the link below to reset your password:</p><p><a href="{{reset_url}}">Reset Password</a></p>',
'Reset Your Password\n\nClick the link below to reset your password:\n{{reset_url}}',
'transactional')
ON CONFLICT (name) DO NOTHING;