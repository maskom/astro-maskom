-- Outage Events Table
CREATE TABLE IF NOT EXISTS outage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_services TEXT[] DEFAULT '{}',
  affected_regions TEXT[] DEFAULT '{}',
  estimated_resolution TIMESTAMP WITH TIME ZONE,
  actual_resolution TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id)
);

-- Outage Notifications Table
CREATE TABLE IF NOT EXISTS outage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outage_event_id UUID NOT NULL REFERENCES outage_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'in_app', 'push')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  recipient TEXT NOT NULL,
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer Notification Preferences Table
CREATE TABLE IF NOT EXISTS customer_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  in_app_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  phone_number TEXT,
  outage_notifications BOOLEAN DEFAULT true,
  maintenance_notifications BOOLEAN DEFAULT true,
  billing_notifications BOOLEAN DEFAULT true,
  marketing_notifications BOOLEAN DEFAULT false,
  minimum_severity TEXT CHECK (minimum_severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('outage_started', 'outage_updated', 'outage_resolved', 'maintenance_scheduled')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
  subject_template TEXT,
  message_template TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Rate Limiting Table
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  count_sent INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type, window_start)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_outage_events_status ON outage_events(status);
CREATE INDEX IF NOT EXISTS idx_outage_events_severity ON outage_events(severity);
CREATE INDEX IF NOT EXISTS idx_outage_events_created_at ON outage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_outage_events_affected_regions ON outage_events USING GIN(affected_regions);

CREATE INDEX IF NOT EXISTS idx_outage_notifications_event_id ON outage_notifications(outage_event_id);
CREATE INDEX IF NOT EXISTS idx_outage_notifications_user_id ON outage_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_outage_notifications_status ON outage_notifications(status);
CREATE INDEX IF NOT EXISTS idx_outage_notifications_type ON outage_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_outage_notifications_sent_at ON outage_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_customer_notification_preferences_user_id ON customer_notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_user_type ON notification_rate_limits(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_rate_limits_window_start ON notification_rate_limits(window_start);

-- Row Level Security (RLS) Policies
ALTER TABLE outage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outage_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;

-- Public read access for outage events (customers need to see outages)
CREATE POLICY "Public read access to outage events" ON outage_events
  FOR SELECT USING (true);

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON outage_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage own notification preferences" ON customer_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to outage events" ON outage_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to outage notifications" ON outage_notifications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to notification templates" ON notification_templates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to rate limits" ON notification_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Triggers for updated_at
CREATE TRIGGER update_outage_events_updated_at
  BEFORE UPDATE ON outage_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_notification_preferences_updated_at
  BEFORE UPDATE ON customer_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if user should be notified based on preferences
CREATE OR REPLACE FUNCTION should_notify_user(
  user_uuid UUID,
  outage_severity TEXT,
  notification_channel TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  prefs RECORD;
  current_time TIME := NOW() AT TIME ZONE 'UTC';
BEGIN
  -- Get user preferences
  SELECT * INTO prefs FROM customer_notification_preferences WHERE user_id = user_uuid;
  
  -- If no preferences found, use defaults
  IF NOT FOUND THEN
    RETURN notification_channel = 'in_app' AND outage_severity IN ('high', 'critical');
  END IF;
  
  -- Check if notifications are enabled for this channel
  CASE notification_channel
    WHEN 'email' THEN
      IF NOT prefs.email_notifications OR NOT prefs.outage_notifications THEN
        RETURN FALSE;
      END IF;
    WHEN 'sms' THEN
      IF NOT prefs.sms_notifications OR NOT prefs.outage_notifications THEN
        RETURN FALSE;
      END IF;
    WHEN 'in_app' THEN
      IF NOT prefs.in_app_notifications OR NOT prefs.outage_notifications THEN
        RETURN FALSE;
      END IF;
    WHEN 'push' THEN
      IF NOT prefs.push_notifications OR NOT prefs.outage_notifications THEN
        RETURN FALSE;
      END IF;
  END CASE;
  
  -- Check minimum severity
  CASE prefs.minimum_severity
    WHEN 'low' THEN RETURN TRUE;
    WHEN 'medium' THEN RETURN outage_severity IN ('medium', 'high', 'critical');
    WHEN 'high' THEN RETURN outage_severity IN ('high', 'critical');
    WHEN 'critical' THEN RETURN outage_severity = 'critical';
  END CASE;
  
  -- Check quiet hours (only for non-critical outages)
  IF outage_severity != 'critical' AND prefs.quiet_hours_start IS NOT NULL AND prefs.quiet_hours_end IS NOT NULL THEN
    IF prefs.quiet_hours_start < prefs.quiet_hours_end THEN
      -- Same day range (e.g., 22:00 to 06:00 doesn't cross midnight)
      IF current_time >= prefs.quiet_hours_start AND current_time <= prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    ELSE
      -- Cross-midnight range (e.g., 22:00 to 06:00)
      IF current_time >= prefs.quiet_hours_start OR current_time <= prefs.quiet_hours_end THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get affected users for an outage
CREATE OR REPLACE FUNCTION get_affected_users_for_outage(
  outage_regions TEXT[],
  outage_services TEXT[]
) RETURNS TABLE(user_id UUID, email TEXT, phone TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.email,
    cnp.phone_number
  FROM user_profiles up
  LEFT JOIN customer_notification_preferences cnp ON up.user_id = cnp.user_id
  WHERE (
    -- If no regions specified, notify all users
    array_length(outage_regions, 1) IS NULL
    OR -- Otherwise, check if user is in affected region
    -- This would need to be implemented based on your user location data
    TRUE -- Placeholder for region matching logic
  );
END;
$$ LANGUAGE plpgsql;

-- Insert default notification templates
INSERT INTO notification_templates (name, type, channel, subject_template, message_template, variables) VALUES
('outage_started_email', 'outage_started', 'email', 'Service Outage: {{title}}', 
 'Dear Customer,\n\nWe are currently experiencing a {{severity}} outage affecting {{services}}.\n\n{{description}}\n\nEstimated resolution time: {{estimated_resolution}}\n\nWe apologize for the inconvenience and are working to resolve this as quickly as possible.\n\nYou can check the status page for real-time updates: {{status_page_url}}\n\nBest regards,\nMaskom Network Team',
 ARRAY['title', 'severity', 'services', 'description', 'estimated_resolution', 'status_page_url']),

('outage_started_sms', 'outage_started', 'sms', NULL,
 'Maskom: {{severity}} outage affecting {{services}}. {{description}}. Status: {{status_page_url}}',
 ARRAY['severity', 'services', 'description', 'status_page_url']),

('outage_resolved_email', 'outage_resolved', 'email', 'Service Restored: {{title}}',
 'Dear Customer,\n\nThe {{severity}} outage affecting {{services}} has been resolved.\n\n{{description}}\n\nService was restored at: {{resolution_time}}\n\nThank you for your patience.\n\nBest regards,\nMaskom Network Team',
 ARRAY['title', 'severity', 'services', 'description', 'resolution_time']),

('outage_resolved_sms', 'outage_resolved', 'sms', NULL,
 'Maskom: Service restored. The {{severity}} outage affecting {{services}} has been resolved.',
 ARRAY['severity', 'services']);