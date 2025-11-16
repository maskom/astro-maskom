-- Network Quality Metrics and Performance Reporting Schema
-- This migration adds comprehensive network quality monitoring capabilities

-- Network Quality Metrics Table
CREATE TABLE IF NOT EXISTS network_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    measurement_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Latency Metrics (in milliseconds)
    latency_avg DECIMAL(8,2) NOT NULL,
    latency_min DECIMAL(8,2) NOT NULL,
    latency_max DECIMAL(8,2) NOT NULL,
    latency_jitter DECIMAL(8,2) NOT NULL DEFAULT 0,
    
    -- Packet Loss Metrics
    packet_loss_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    packets_sent INTEGER NOT NULL DEFAULT 0,
    packets_received INTEGER NOT NULL DEFAULT 0,
    
    -- Connection Quality
    connection_stability_score DECIMAL(5,2) NOT NULL DEFAULT 100, -- 0-100 score
    uptime_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
    dns_resolution_time_ms DECIMAL(8,2) NOT NULL DEFAULT 0,
    
    -- Speed Test Results
    download_mbps DECIMAL(10,2),
    upload_mbps DECIMAL(10,2),
    ping_ms DECIMAL(8,2),
    
    -- Quality of Service Metrics
    qos_score DECIMAL(5,2), -- Overall quality score 0-100
    voip_quality_score DECIMAL(5,2), -- VoIP-specific quality
    streaming_quality_score DECIMAL(5,2), -- Streaming quality
    
    -- Geographic and Service Info
    server_location VARCHAR(100),
    test_server VARCHAR(200),
    connection_type VARCHAR(50), -- fiber, wireless, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Reports Table
CREATE TABLE IF NOT EXISTS performance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'sla_certificate', 'custom')),
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    
    -- Report Content
    report_data JSONB NOT NULL, -- Contains all metrics and analysis
    summary_text TEXT,
    
    -- SLA Compliance
    sla_compliance_percentage DECIMAL(5,2),
    uptime_guarantee_met BOOLEAN,
    speed_guarantee_met BOOLEAN,
    
    -- Performance Scores
    overall_quality_score DECIMAL(5,2),
    reliability_score DECIMAL(5,2),
    speed_consistency_score DECIMAL(5,2),
    
    -- Report Status
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generating', 'generated', 'failed')),
    file_path VARCHAR(500), -- Path to generated PDF/CSV file
    file_size_bytes INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_at TIMESTAMP WITH TIME ZONE
);

-- SLA Compliance Tracking Table
CREATE TABLE IF NOT EXISTS sla_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    compliance_period DATE NOT NULL, -- Monthly period
    
    -- SLA Metrics
    uptime_guarantee_percentage DECIMAL(5,2) NOT NULL DEFAULT 99.9,
    actual_uptime_percentage DECIMAL(5,2) NOT NULL,
    speed_guarantee_mbps DECIMAL(10,2),
    average_speed_mbps DECIMAL(10,2),
    latency_guarantee_ms DECIMAL(8,2),
    average_latency_ms DECIMAL(8,2),
    
    -- Compliance Results
    uptime_compliance BOOLEAN NOT NULL,
    speed_compliance BOOLEAN,
    latency_compliance BOOLEAN,
    overall_compliance BOOLEAN NOT NULL,
    
    -- Credits/Compensation
    service_credits_earned DECIMAL(10,2) DEFAULT 0,
    compensation_applied BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, package_id, compliance_period)
);

-- Quality Alerts Table
CREATE TABLE IF NOT EXISTS quality_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('degradation', 'outage', 'sla_breach', 'maintenance')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Alert Details
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    affected_metrics JSONB, -- Which metrics triggered the alert
    
    -- Timing
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    estimated_resolution_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
    auto_resolved BOOLEAN DEFAULT false,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    notification_channels JSONB DEFAULT '[]', -- Array of channels used
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Network Quality Baselines (for comparison)
CREATE TABLE IF NOT EXISTS network_quality_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id VARCHAR(100) NOT NULL,
    geographic_area VARCHAR(100),
    
    -- Baseline Metrics (averages for comparison)
    baseline_latency_ms DECIMAL(8,2) NOT NULL,
    baseline_packet_loss DECIMAL(5,2) NOT NULL DEFAULT 0,
    baseline_uptime DECIMAL(5,2) NOT NULL DEFAULT 99.9,
    baseline_download_mbps DECIMAL(10,2),
    baseline_upload_mbps DECIMAL(10,2),
    
    -- Quality Thresholds
    acceptable_latency_range JSONB, -- {min: X, max: Y}
    acceptable_packet_loss_threshold DECIMAL(5,2),
    minimum_uptime_threshold DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(package_id, geographic_area)
);

-- Performance Benchmarks
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    benchmark_period DATE NOT NULL, -- Monthly
    
    -- User Performance vs Averages
    user_avg_latency_ms DECIMAL(8,2),
    area_avg_latency_ms DECIMAL(8,2),
    user_avg_download_mbps DECIMAL(10,2),
    area_avg_download_mbps DECIMAL(10,2),
    user_uptime_percentage DECIMAL(5,2),
    area_avg_uptime_percentage DECIMAL(5,2),
    
    -- Performance Rankings
    latency_ranking_percentile DECIMAL(5,2), -- User's percentile in area
    speed_ranking_percentile DECIMAL(5,2),
    reliability_ranking_percentile DECIMAL(5,2),
    
    -- Comparative Analysis
    performance_vs_area_average DECIMAL(5,2), -- Percentage difference
    performance_grade VARCHAR(2), -- A+, A, B+, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, benchmark_period)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_network_quality_metrics_user_time ON network_quality_metrics(user_id, measurement_time);
CREATE INDEX IF NOT EXISTS idx_network_quality_metrics_package_time ON network_quality_metrics(package_id, measurement_time);
CREATE INDEX IF NOT EXISTS idx_network_quality_metrics_time ON network_quality_metrics(measurement_time);

CREATE INDEX IF NOT EXISTS idx_performance_reports_user_period ON performance_reports(user_id, report_period_start);
CREATE INDEX IF NOT EXISTS idx_performance_reports_type ON performance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_performance_reports_status ON performance_reports(status);

CREATE INDEX IF NOT EXISTS idx_sla_compliance_user_period ON sla_compliance(user_id, compliance_period);
CREATE INDEX IF NOT EXISTS idx_sla_compliance_compliance ON sla_compliance(overall_compliance);
CREATE INDEX IF NOT EXISTS idx_sla_compliance_package ON sla_compliance(package_id);

CREATE INDEX IF NOT EXISTS idx_quality_alerts_user_status ON quality_alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_severity ON quality_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_detected_at ON quality_alerts(detected_at);

CREATE INDEX IF NOT EXISTS idx_network_quality_baselines_package_area ON network_quality_baselines(package_id, geographic_area);

CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_user_period ON performance_benchmarks(user_id, benchmark_period);

-- Row Level Security (RLS) Policies
ALTER TABLE network_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_quality_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for network_quality_metrics
CREATE POLICY "Users can view their own quality metrics"
    ON network_quality_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quality metrics"
    ON network_quality_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for performance_reports
CREATE POLICY "Users can view their own performance reports"
    ON performance_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance reports"
    ON performance_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sla_compliance
CREATE POLICY "Users can view their own SLA compliance"
    ON sla_compliance FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policies for quality_alerts
CREATE POLICY "Users can view their own quality alerts"
    ON quality_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quality alerts"
    ON quality_alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for performance_benchmarks
CREATE POLICY "Users can view their own performance benchmarks"
    ON performance_benchmarks FOR SELECT
    USING (auth.uid() = user_id);

-- Admin policies for all tables
CREATE POLICY "Admins can view all quality metrics"
    ON network_quality_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can view all performance reports"
    ON performance_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can view all SLA compliance"
    ON sla_compliance FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can view all quality alerts"
    ON quality_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Public read access for baselines (used for comparisons)
CREATE POLICY "Public read access for quality baselines"
    ON network_quality_baselines FOR SELECT
    USING (true);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_sla_compliance_updated_at 
    BEFORE UPDATE ON sla_compliance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_network_quality_baselines_updated_at 
    BEFORE UPDATE ON network_quality_baselines 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(
    p_latency_avg DECIMAL,
    p_packet_loss DECIMAL,
    p_uptime DECIMAL,
    p_jitter DECIMAL
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    latency_score DECIMAL(5,2);
    packet_loss_score DECIMAL(5,2);
    uptime_score DECIMAL(5,2);
    jitter_score DECIMAL(5,2);
    total_score DECIMAL(5,2);
BEGIN
    -- Latency score (lower is better, 0-100)
    latency_score := GREATEST(0, LEAST(100, 100 - (p_latency_avg - 10) * 2));
    
    -- Packet loss score (lower is better, 0-100)
    packet_loss_score := GREATEST(0, LEAST(100, 100 - p_packet_loss * 10));
    
    -- Uptime score (higher is better, 0-100)
    uptime_score := p_uptime;
    
    -- Jitter score (lower is better, 0-100)
    jitter_score := GREATEST(0, LEAST(100, 100 - p_jitter * 5));
    
    -- Weighted average
    total_score := (latency_score * 0.3 + packet_loss_score * 0.3 + uptime_score * 0.3 + jitter_score * 0.1);
    
    RETURN ROUND(total_score, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically calculate QoS score when metrics are inserted
CREATE OR REPLACE FUNCTION calculate_qos_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.qos_score := calculate_quality_score(
        NEW.latency_avg,
        NEW.packet_loss_percentage,
        NEW.uptime_percentage,
        NEW.latency_jitter
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate QoS score
CREATE TRIGGER calculate_qos_score_trigger
    BEFORE INSERT ON network_quality_metrics
    FOR EACH ROW EXECUTE FUNCTION calculate_qos_score();

-- Function to check for quality degradation and create alerts
CREATE OR REPLACE FUNCTION check_quality_degradation()
RETURNS TRIGGER AS $$
DECLARE
    baseline_record network_quality_baselines%ROWTYPE;
    degradation_threshold DECIMAL := 20; -- 20% degradation threshold
    latency_degraded BOOLEAN := false;
    packet_loss_degraded BOOLEAN := false;
    uptime_degraded BOOLEAN := false;
BEGIN
    -- Get baseline for this package and area (assuming user area from profile)
    SELECT * INTO baseline_record
    FROM network_quality_baselines
    WHERE package_id = NEW.package_id
    LIMIT 1;
    
    IF FOUND THEN
        -- Check latency degradation
        IF NEW.latency_avg > baseline_record.baseline_latency_ms * (1 + degradation_threshold/100) THEN
            latency_degraded := true;
        END IF;
        
        -- Check packet loss degradation
        IF NEW.packet_loss_percentage > baseline_record.baseline_packet_loss * (1 + degradation_threshold/100) THEN
            packet_loss_degraded := true;
        END IF;
        
        -- Check uptime degradation
        IF NEW.uptime_percentage < baseline_record.baseline_uptime * (1 - degradation_threshold/100) THEN
            uptime_degraded := true;
        END IF;
        
        -- Create alert if significant degradation detected
        IF latency_degraded OR packet_loss_degraded OR uptime_degraded THEN
            INSERT INTO quality_alerts (
                user_id,
                alert_type,
                severity,
                title,
                message,
                affected_metrics
            ) VALUES (
                NEW.user_id,
                'degradation',
                CASE 
                    WHEN (latency_degraded AND packet_loss_degraded) OR (latency_degraded AND uptime_degraded) OR (packet_loss_degraded AND uptime_degraded) THEN 'high'
                    WHEN latency_degraded OR packet_loss_degraded OR uptime_degraded THEN 'medium'
                    ELSE 'low'
                END,
                'Network Quality Degradation Detected',
                format('Network quality has degraded beyond acceptable thresholds. Latency: %sms, Packet Loss: %s%%, Uptime: %s%%',
                       NEW.latency_avg, NEW.packet_loss_percentage, NEW.uptime_percentage),
                jsonb_build_object(
                    'latency_degraded', latency_degraded,
                    'packet_loss_degraded', packet_loss_degraded,
                    'uptime_degraded', uptime_degraded,
                    'current_latency', NEW.latency_avg,
                    'current_packet_loss', NEW.packet_loss_percentage,
                    'current_uptime', NEW.uptime_percentage
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check quality degradation
CREATE TRIGGER check_quality_degradation_trigger
    AFTER INSERT ON network_quality_metrics
    FOR EACH ROW EXECUTE FUNCTION check_quality_degradation();

-- Function to calculate monthly SLA compliance
CREATE OR REPLACE FUNCTION calculate_monthly_sla_compliance()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    compliance_data RECORD;
    sla_compliance_percentage DECIMAL(5,2);
    uptime_compliance BOOLEAN;
    speed_compliance BOOLEAN;
    latency_compliance BOOLEAN;
    overall_compliance BOOLEAN;
BEGIN
    -- Loop through all users with active packages
    FOR user_record IN 
        SELECT DISTINCT user_id, package_id 
        FROM network_quality_metrics 
        WHERE measurement_time >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    LOOP
        -- Calculate compliance metrics for the month
        SELECT 
            AVG(uptime_percentage) as avg_uptime,
            AVG(download_mbps) as avg_speed,
            AVG(latency_avg) as avg_latency
        INTO compliance_data
        FROM network_quality_metrics
        WHERE user_id = user_record.user_id
        AND package_id = user_record.package_id
        AND measurement_time >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND measurement_time < DATE_TRUNC('month', CURRENT_DATE);
        
        IF FOUND THEN
            -- Get SLA requirements for this package
            -- This would typically come from package configuration
            uptime_compliance := compliance_data.avg_uptime >= 99.9;
            speed_compliance := compliance_data.avg_speed >= 50; -- Example threshold
            latency_compliance := compliance_data.avg_latency <= 50; -- Example threshold
            overall_compliance := uptime_compliance AND COALESCE(speed_compliance, true) AND COALESCE(latency_compliance, true);
            
            -- Insert or update SLA compliance record
            INSERT INTO sla_compliance (
                user_id,
                package_id,
                compliance_period,
                actual_uptime_percentage,
                average_speed_mbps,
                average_latency_ms,
                uptime_compliance,
                speed_compliance,
                latency_compliance,
                overall_compliance
            ) VALUES (
                user_record.user_id,
                user_record.package_id,
                DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
                compliance_data.avg_uptime,
                compliance_data.avg_speed,
                compliance_data.avg_latency,
                uptime_compliance,
                speed_compliance,
                latency_compliance,
                overall_compliance
            )
            ON CONFLICT (user_id, package_id, compliance_period)
            DO UPDATE SET
                actual_uptime_percentage = EXCLUDED.actual_uptime_percentage,
                average_speed_mbps = EXCLUDED.average_speed_mbps,
                average_latency_ms = EXCLUDED.average_latency_ms,
                uptime_compliance = EXCLUDED.uptime_compliance,
                speed_compliance = EXCLUDED.speed_compliance,
                latency_compliance = EXCLUDED.latency_compliance,
                overall_compliance = EXCLUDED.overall_compliance,
                updated_at = NOW();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate performance benchmarks
CREATE OR REPLACE FUNCTION generate_performance_benchmarks()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    user_metrics RECORD;
    area_metrics RECORD;
    performance_grade VARCHAR(2);
BEGIN
    -- Loop through all users with quality metrics
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM network_quality_metrics 
        WHERE measurement_time >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    LOOP
        -- Get user's average metrics for the month
        SELECT 
            AVG(latency_avg) as avg_latency,
            AVG(download_mbps) as avg_download,
            AVG(uptime_percentage) as avg_uptime
        INTO user_metrics
        FROM network_quality_metrics
        WHERE user_id = user_record.user_id
        AND measurement_time >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND measurement_time < DATE_TRUNC('month', CURRENT_DATE);
        
        IF FOUND THEN
            -- Get area averages (simplified - would need geographic grouping)
            SELECT 
                AVG(latency_avg) as avg_latency,
                AVG(download_mbps) as avg_download,
                AVG(uptime_percentage) as avg_uptime
            INTO area_metrics
            FROM network_quality_metrics
            WHERE measurement_time >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            AND measurement_time < DATE_TRUNC('month', CURRENT_DATE);
            
            -- Calculate performance grade
            IF user_metrics.avg_latency <= area_metrics.avg_latency * 0.8 AND 
               user_metrics.avg_download >= area_metrics.avg_download * 1.2 AND 
               user_metrics.avg_uptime >= area_metrics.avg_uptime THEN
                performance_grade := 'A+';
            ELSIF user_metrics.avg_latency <= area_metrics.avg_latency * 0.9 AND 
                  user_metrics.avg_download >= area_metrics.avg_download * 1.1 AND 
                  user_metrics.avg_uptime >= area_metrics.avg_uptime * 0.99 THEN
                performance_grade := 'A';
            ELSIF user_metrics.avg_latency <= area_metrics.avg_latency AND 
                  user_metrics.avg_download >= area_metrics.avg_download AND 
                  user_metrics.avg_uptime >= area_metrics.avg_uptime * 0.98 THEN
                performance_grade := 'B+';
            ELSIF user_metrics.avg_latency <= area_metrics.avg_latency * 1.1 AND 
                  user_metrics.avg_download >= area_metrics.avg_download * 0.9 AND 
                  user_metrics.avg_uptime >= area_metrics.avg_uptime * 0.97 THEN
                performance_grade := 'B';
            ELSE
                performance_grade := 'C';
            END IF;
            
            -- Insert or update benchmark record
            INSERT INTO performance_benchmarks (
                user_id,
                benchmark_period,
                user_avg_latency_ms,
                area_avg_latency_ms,
                user_avg_download_mbps,
                area_avg_download_mbps,
                user_uptime_percentage,
                area_avg_uptime_percentage,
                performance_grade,
                performance_vs_area_average
            ) VALUES (
                user_record.user_id,
                DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
                user_metrics.avg_latency,
                area_metrics.avg_latency,
                user_metrics.avg_download,
                area_metrics.avg_download,
                user_metrics.avg_uptime,
                area_metrics.avg_uptime,
                performance_grade,
                CASE 
                    WHEN area_metrics.avg_download > 0 THEN ((user_metrics.avg_download - area_metrics.avg_download) / area_metrics.avg_download) * 100
                    ELSE 0
                END
            )
            ON CONFLICT (user_id, benchmark_period)
            DO UPDATE SET
                user_avg_latency_ms = EXCLUDED.user_avg_latency_ms,
                area_avg_latency_ms = EXCLUDED.area_avg_latency_ms,
                user_avg_download_mbps = EXCLUDED.user_avg_download_mbps,
                area_avg_download_mbps = EXCLUDED.area_avg_download_mbps,
                user_uptime_percentage = EXCLUDED.user_uptime_percentage,
                area_avg_uptime_percentage = EXCLUDED.area_avg_uptime_percentage,
                performance_grade = EXCLUDED.performance_grade,
                performance_vs_area_average = EXCLUDED.performance_vs_area_average;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create default quality baselines for common packages
INSERT INTO network_quality_baselines (package_id, geographic_area, baseline_latency_ms, baseline_packet_loss, baseline_uptime, baseline_download_mbps, baseline_upload_mbps, acceptable_latency_range, acceptable_packet_loss_threshold, minimum_uptime_threshold) VALUES
('basic', 'general', 50, 0.5, 99.5, 25, 10, '{"min": 10, "max": 100}', 1.0, 99.0),
('standard', 'general', 30, 0.3, 99.8, 100, 50, '{"min": 5, "max": 75}', 0.5, 99.5),
('premium', 'general', 15, 0.1, 99.9, 500, 200, '{"min": 2, "max": 50}', 0.2, 99.9),
('enterprise', 'general', 10, 0.05, 99.95, 1000, 500, '{"min": 1, "max": 30}', 0.1, 99.95)
ON CONFLICT (package_id, geographic_area) DO NOTHING;