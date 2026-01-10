-- Network Coverage System Schema
-- Migration for coverage areas, zones, and availability checking

-- Coverage Zones Table (defines different types of coverage areas)
CREATE TABLE IF NOT EXISTS coverage_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('available', 'coming_soon', 'planned', 'unavailable')),
    description TEXT,
    color VARCHAR(7) DEFAULT '#cccccc', -- Hex color code for map display
    priority INTEGER DEFAULT 0, -- Higher priority zones override lower ones
    estimated_available_date TIMESTAMP WITH TIME ZONE, -- For coming_soon zones
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coverage Areas Table (geographic areas with coverage information)
CREATE TABLE IF NOT EXISTS coverage_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES coverage_zones(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geometry GEOGRAPHY(POLYGON, 4326) NOT NULL, -- PostGIS geographic polygon
    center_point GEOGRAPHY(POINT, 4326) NOT NULL, -- Center point for quick queries
    address_data JSONB DEFAULT '{}', -- Address components for this area
    population_density INTEGER, -- Optional: people per km²
    average_income DECIMAL(12,2), -- Optional: for business analysis
    installation_complexity VARCHAR(50) CHECK (installation_complexity IN ('low', 'medium', 'high')),
    estimated_installation_days INTEGER DEFAULT 7,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability Check Logs Table (track all coverage checks)
CREATE TABLE IF NOT EXISTS availability_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    formatted_address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    point GEOGRAPHY(POINT, 4326) NOT NULL,
    is_available BOOLEAN NOT NULL,
    zone_id UUID REFERENCES coverage_zones(id),
    area_id UUID REFERENCES coverage_areas(id),
    available_packages JSONB DEFAULT '[]', -- List of available package IDs
    recommended_package UUID, -- Recommended package ID
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coverage Leads Table (capture leads for unavailable areas)
CREATE TABLE IF NOT EXISTS coverage_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    point GEOGRAPHY(POINT, 4326),
    notes TEXT,
    preferred_contact_method VARCHAR(50) CHECK (preferred_contact_method IN ('email', 'phone', 'whatsapp')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'converted')),
    follow_up_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID, -- Staff member assigned to this lead
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coverage Package Availability Table (which packages are available in which areas)
CREATE TABLE IF NOT EXISTS coverage_package_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID REFERENCES coverage_areas(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL, -- Reference to package data
    is_available BOOLEAN DEFAULT true,
    installation_fee DECIMAL(12,2) DEFAULT 0,
    monthly_fee DECIMAL(12,2),
    max_speed INTEGER, -- Mbps
    special_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(area_id, package_id)
);

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coverage_zones_type ON coverage_zones(type);
CREATE INDEX IF NOT EXISTS idx_coverage_zones_is_active ON coverage_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_coverage_zones_priority ON coverage_zones(priority DESC);

CREATE INDEX IF NOT EXISTS idx_coverage_areas_zone_id ON coverage_areas(zone_id);
CREATE INDEX IF NOT EXISTS idx_coverage_areas_is_active ON coverage_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_coverage_areas_geometry ON coverage_areas USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_coverage_areas_center_point ON coverage_areas USING GIST(center_point);

CREATE INDEX IF NOT EXISTS idx_availability_checks_point ON availability_checks USING GIST(point);
CREATE INDEX IF NOT EXISTS idx_availability_checks_address ON availability_checks USING gin(to_tsvector('english', address));
CREATE INDEX IF NOT EXISTS idx_availability_checks_created_at ON availability_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_availability_checks_user_id ON availability_checks(user_id);

CREATE INDEX IF NOT EXISTS idx_coverage_leads_point ON coverage_leads USING GIST(point);
CREATE INDEX IF NOT EXISTS idx_coverage_leads_status ON coverage_leads(status);
CREATE INDEX IF NOT EXISTS idx_coverage_leads_created_at ON coverage_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_coverage_leads_email ON coverage_leads(email);

CREATE INDEX IF NOT EXISTS idx_coverage_package_availability_area_id ON coverage_package_availability(area_id);
CREATE INDEX IF NOT EXISTS idx_coverage_package_availability_package_id ON coverage_package_availability(package_id);

-- Row Level Security (RLS) Policies
ALTER TABLE coverage_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_package_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coverage_zones (public read access for authenticated users)
CREATE POLICY "Authenticated users can view coverage zones"
    ON coverage_zones FOR SELECT
    USING (auth.role() = 'authenticated');

-- RLS Policies for coverage_areas (public read access for authenticated users)
CREATE POLICY "Authenticated users can view coverage areas"
    ON coverage_areas FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policies for availability_checks
CREATE POLICY "Users can view their own availability checks"
    ON availability_checks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert availability checks"
    ON availability_checks FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL); -- Allow anonymous checks

-- RLS Policies for coverage_leads
CREATE POLICY "Users can view their own leads"
    ON coverage_leads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert leads"
    ON coverage_leads FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL); -- Allow anonymous leads

-- RLS Policies for coverage_package_availability (public read access)
CREATE POLICY "Authenticated users can view package availability"
    ON coverage_package_availability FOR SELECT
    USING (auth.role() = 'authenticated');

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_coverage_zones_updated_at 
    BEFORE UPDATE ON coverage_zones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_areas_updated_at 
    BEFORE UPDATE ON coverage_areas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_leads_updated_at 
    BEFORE UPDATE ON coverage_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_package_availability_updated_at 
    BEFORE UPDATE ON coverage_package_availability 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check coverage at a specific point
CREATE OR REPLACE FUNCTION check_coverage_at_point(lat DECIMAL, lng DECIMAL)
RETURNS TABLE(
    is_available BOOLEAN,
    zone_id UUID,
    zone_name VARCHAR,
    zone_type VARCHAR,
    area_id UUID,
    area_name VARCHAR,
    estimated_available_date TIMESTAMP WITH TIME ZONE,
    installation_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cz.type = 'available' as is_available,
        cz.id as zone_id,
        cz.name as zone_name,
        cz.type as zone_type,
        ca.id as area_id,
        ca.name as area_name,
        cz.estimated_available_date,
        ca.estimated_installation_days
    FROM coverage_areas ca
    JOIN coverage_zones cz ON ca.zone_id = cz.id
    WHERE ST_Contains(ca.geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    AND ca.is_active = true
    AND cz.is_active = true
    ORDER BY cz.priority DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get available packages at a point
CREATE OR REPLACE FUNCTION get_available_packages_at_point(lat DECIMAL, lng DECIMAL)
RETURNS TABLE(
    package_id VARCHAR,
    is_available BOOLEAN,
    installation_fee DECIMAL,
    monthly_fee DECIMAL,
    max_speed INTEGER,
    special_requirements TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cpa.package_id,
        cpa.is_available,
        cpa.installation_fee,
        cpa.monthly_fee,
        cpa.max_speed,
        cpa.special_requirements
    FROM coverage_package_availability cpa
    JOIN coverage_areas ca ON cpa.area_id = ca.id
    WHERE ST_Contains(ca.geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    AND ca.is_active = true
    AND cpa.is_available = true;
END;
$$ LANGUAGE plpgsql;

-- Insert default coverage zones
INSERT INTO coverage_zones (name, type, description, color, priority) VALUES
('Service Available', 'available', 'Full service availability with standard installation', '#22c55e', 3),
('Coming Soon', 'coming_soon', 'Service under development, pre-orders available', '#f59e0b', 2),
('Planned Expansion', 'planned', 'Future expansion area, register for updates', '#3b82f6', 1),
('Service Unavailable', 'unavailable', 'No current service plans', '#ef4444', 0)
ON CONFLICT DO NOTHING;

-- Insert sample coverage areas for major Indonesian cities
INSERT INTO coverage_areas (zone_id, name, geometry, center_point, installation_complexity, estimated_installation_days) VALUES
(
    (SELECT id FROM coverage_zones WHERE type = 'available' LIMIT 1),
    'Jakarta Central',
    ST_GeomFromText('POLYGON((106.8 -6.2, 106.9 -6.2, 106.9 -6.1, 106.8 -6.1, 106.8 -6.2))', 4326),
    ST_SetSRID(ST_MakePoint(106.85, -6.15), 4326),
    'medium',
    7
),
(
    (SELECT id FROM coverage_zones WHERE type = 'available' LIMIT 1),
    'Surabaya East',
    ST_GeomFromText('POLYGON((112.7 -7.3, 112.8 -7.3, 112.8 -7.2, 112.7 -7.2, 112.7 -7.3))', 4326),
    ST_SetSRID(ST_MakePoint(112.75, -7.25), 4326),
    'low',
    5
),
(
    (SELECT id FROM coverage_zones WHERE type = 'coming_soon' LIMIT 1),
    'Bandung South',
    ST_GeomFromText('POLYGON((107.6 -6.95, 107.7 -6.95, 107.7 -6.85, 107.6 -6.85, 107.6 -6.95))', 4326),
    ST_SetSRID(ST_MakePoint(107.65, -6.9), 4326),
    'medium',
    10
)
ON CONFLICT DO NOTHING;

-- Insert sample package availability
INSERT INTO coverage_package_availability (area_id, package_id, is_available, installation_fee, monthly_fee, max_speed) VALUES
(
    (SELECT id FROM coverage_areas WHERE name = 'Jakarta Central' LIMIT 1),
    'home-basic',
    true,
    500000,
    299000,
    50
),
(
    (SELECT id FROM coverage_areas WHERE name = 'Jakarta Central' LIMIT 1),
    'home-premium',
    true,
    750000,
    599000,
    100
),
(
    (SELECT id FROM coverage_areas WHERE name = 'Surabaya East' LIMIT 1),
    'home-basic',
    true,
    450000,
    279000,
    50
),
(
    (SELECT id FROM coverage_areas WHERE name = 'Bandung South' LIMIT 1),
    'home-basic',
    true,
    600000,
    329000,
    50
)
ON CONFLICT DO NOTHING;