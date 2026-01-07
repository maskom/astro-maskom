-- Knowledge Base and FAQ System Schema
-- Migration for comprehensive knowledge base management

-- Knowledge Base Categories Table
CREATE TABLE IF NOT EXISTS kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Icon name or emoji
  color TEXT DEFAULT '#6366f1', -- Hex color for category
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Articles Table
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL, -- Markdown content
  excerpt TEXT, -- Brief description for search results
  category_id UUID NOT NULL REFERENCES kb_categories(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'published', 'archived')) DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  search_rank REAL DEFAULT 1.0, -- For search relevance boosting
  tags TEXT[], -- Array of tags for better categorization
  related_articles UUID[], -- Array of related article IDs
  video_url TEXT, -- For video tutorials
  video_thumbnail TEXT, -- Thumbnail for video
  reading_time_minutes INTEGER, -- Estimated reading time
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Article Ratings Table
CREATE TABLE IF NOT EXISTS kb_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- 1-5 star rating
  feedback TEXT, -- Optional feedback text
  helpful BOOLEAN NOT NULL, -- Simple helpful/not helpful feedback
  ip_address INET, -- For anonymous users
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(article_id, user_id), -- One rating per user per article
  UNIQUE(article_id, ip_address) -- One rating per IP for anonymous users
);

-- Knowledge Base Search Logs Table
CREATE TABLE IF NOT EXISTS kb_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_article_id UUID REFERENCES kb_articles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  session_id TEXT, -- For tracking search sessions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Article History Table (for version control)
CREATE TABLE IF NOT EXISTS kb_article_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_summary TEXT, -- Description of what changed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Attachments Table (for images, files, etc.)
CREATE TABLE IF NOT EXISTS kb_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  alt_text TEXT, -- For images
  sort_order INTEGER DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Performance

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_kb_categories_slug ON kb_categories(slug);
CREATE INDEX IF NOT EXISTS idx_kb_categories_parent_id ON kb_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_kb_categories_is_active ON kb_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_kb_categories_sort_order ON kb_categories(sort_order);

-- Articles indexes
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category_id ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author_id ON kb_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_featured ON kb_articles(featured);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published_at ON kb_articles(published_at);
CREATE INDEX IF NOT EXISTS idx_kb_articles_view_count ON kb_articles(view_count);
CREATE INDEX IF NOT EXISTS idx_kb_articles_created_at ON kb_articles(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tags ON kb_articles USING GIN(tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON kb_articles USING GIN(
  to_tsvector('english', title || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '') || ' ' || array_to_string(tags, ' '))
);

-- Ratings indexes
CREATE INDEX IF NOT EXISTS idx_kb_ratings_article_id ON kb_ratings(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_ratings_user_id ON kb_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_ratings_helpful ON kb_ratings(helpful);
CREATE INDEX IF NOT EXISTS idx_kb_ratings_created_at ON kb_ratings(created_at);

-- Search logs indexes
CREATE INDEX IF NOT EXISTS idx_kb_search_logs_query ON kb_search_logs(query);
CREATE INDEX IF NOT EXISTS idx_kb_search_logs_user_id ON kb_search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_kb_search_logs_created_at ON kb_search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_kb_search_logs_session_id ON kb_search_logs(session_id);

-- Article history indexes
CREATE INDEX IF NOT EXISTS idx_kb_article_history_article_id ON kb_article_history(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_article_history_version ON kb_article_history(article_id, version);
CREATE INDEX IF NOT EXISTS idx_kb_article_history_created_at ON kb_article_history(created_at);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_kb_attachments_article_id ON kb_attachments(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_attachments_uploaded_by ON kb_attachments(uploaded_by);

-- Row Level Security (RLS) Policies
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_article_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_attachments ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles and categories
CREATE POLICY "Public read access to categories" ON kb_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access to published articles" ON kb_articles
  FOR SELECT USING (status = 'published');

-- Users can read their own ratings and search logs
CREATE POLICY "Users can read own ratings" ON kb_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own search logs" ON kb_search_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create ratings and search logs
CREATE POLICY "Users can create ratings" ON kb_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create search logs" ON kb_search_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Support staff and admins can manage knowledge base content
CREATE POLICY "Support staff can manage articles" ON kb_articles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_security_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Support staff can manage categories" ON kb_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_security_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('support', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Support staff can manage attachments" ON kb_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_security_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('support', 'admin', 'super_admin')
    )
  );

-- Service role full access
CREATE POLICY "Service role full access to categories" ON kb_categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to articles" ON kb_articles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to ratings" ON kb_ratings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to search logs" ON kb_search_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to article history" ON kb_article_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to attachments" ON kb_attachments
  FOR ALL USING (auth.role() = 'service_role');

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON kb_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create article history on update
CREATE OR REPLACE FUNCTION create_article_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO kb_article_history (
      article_id, 
      version, 
      title, 
      content, 
      excerpt, 
      changed_by,
      change_summary
    )
    SELECT 
      NEW.id,
      COALESCE((SELECT MAX(version) FROM kb_article_history WHERE article_id = NEW.id), 0) + 1,
      NEW.title,
      NEW.content,
      NEW.excerpt,
      auth.uid(),
      'Article updated';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create article history
CREATE TRIGGER create_kb_article_history
  BEFORE UPDATE ON kb_articles
  FOR EACH ROW
  EXECUTE FUNCTION create_article_history();

-- Function to update view count
CREATE OR REPLACE FUNCTION increment_article_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE kb_articles 
  SET view_count = view_count + 1 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate article statistics
CREATE OR REPLACE FUNCTION update_article_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update helpful counts based on new rating
  UPDATE kb_articles 
  SET 
    helpful_count = (
      SELECT COUNT(*) FROM kb_ratings 
      WHERE article_id = NEW.article_id AND helpful = true
    ),
    not_helpful_count = (
      SELECT COUNT(*) FROM kb_ratings 
      WHERE article_id = NEW.article_id AND helpful = false
    )
  WHERE id = NEW.article_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update statistics when rating is added
CREATE TRIGGER update_article_statistics_on_rating
  AFTER INSERT ON kb_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_article_statistics();

-- Function to generate unique slugs
CREATE OR REPLACE FUNCTION generate_unique_slug(table_name TEXT, title TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(trailing '-' FROM base_slug);
  
  -- Start with base slug
  slug := base_slug;
  
  -- Check if slug exists and make unique if needed
  WHILE EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_name = table_name 
                AND EXISTS (SELECT 1 FROM kb_articles WHERE slug = slug LIMIT 1)
                UNION ALL
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = table_name 
                AND EXISTS (SELECT 1 FROM kb_categories WHERE slug = slug LIMIT 1)) LOOP
    slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Insert default categories
INSERT INTO kb_categories (name, slug, description, icon, color, sort_order) VALUES
('Getting Started', 'getting-started', 'Basic setup and installation guides', '🚀', '#10b981', 1),
('Account & Billing', 'account-billing', 'Account management and billing support', '💳', '#f59e0b', 2),
('Technical Support', 'technical-support', 'Technical troubleshooting and diagnostics', '🔧', '#ef4444', 3),
('Network & Connectivity', 'network-connectivity', 'Network issues and connectivity problems', '🌐', '#3b82f6', 4),
('Equipment & Hardware', 'equipment-hardware', 'Router, modem, and equipment support', '📡', '#8b5cf6', 5),
('Services & Features', 'services-features', 'Service features and add-on support', '⚡', '#06b6d4', 6)
ON CONFLICT (slug) DO NOTHING;

-- Create sample articles for testing
INSERT INTO kb_articles (
  title, 
  slug, 
  content, 
  excerpt, 
  category_id, 
  author_id, 
  status, 
  featured,
  reading_time_minutes,
  difficulty_level,
  published_at
) VALUES
(
  'How to Set Up Your Router for the First Time',
  'how-to-set-up-your-router-for-the-first-time',
  '# Setting Up Your Router\n\nThis guide will walk you through the initial setup of your Maskom Network router.\n\n## Step 1: Unboxing\n\nCarefully unbox your router and ensure you have:\n- Router unit\n- Power adapter\n- Ethernet cable\n- Quick start guide\n\n## Step 2: Physical Connections\n\n1. Connect the power adapter to your router\n2. Connect the router to your modem using the Ethernet cable\n3. Power on both devices\n\n## Step 3: Access Router Settings\n\n1. Connect your computer to the router via WiFi or Ethernet\n2. Open a web browser and navigate to `192.168.1.1`\n3. Log in with the default credentials\n\n## Step 4: Configure Network Settings\n\n1. Set your WiFi network name (SSID)\n2. Create a strong password\n3. Configure security settings\n\n## Troubleshooting\n\nIf you encounter issues:\n- Check all cable connections\n- Restart both modem and router\n- Ensure your device is properly connected',
  'Complete guide for setting up your Maskom Network router for the first time, including physical connections and configuration.',
  (SELECT id FROM kb_categories WHERE slug = 'getting-started'),
  (SELECT id FROM auth.users LIMIT 1), -- Will be updated with actual user ID
  'published',
  true,
  5,
  'beginner',
  NOW()
),
(
  'Understanding Your Monthly Bill',
  'understanding-your-monthly-bill',
  '# Understanding Your Monthly Bill\n\nThis article explains the different components of your Maskom Network monthly bill.\n\n## Bill Components\n\n### Monthly Service Fee\nThis is the base cost for your internet service plan.\n\n### Data Usage Charges\nAdditional charges if you exceed your data cap.\n\n### Equipment Rental\nMonthly fee for router/modem rental if applicable.\n\n### Taxes and Fees\nGovernment-mandated taxes and regulatory fees.\n\n## How to Read Your Bill\n\n1. **Service Period**: Dates covered by this bill\n2. **Amount Due**: Total payment required\n3. **Due Date**: When payment must be received\n4. **Previous Balance**: Any unpaid amount from previous bills\n\n## Payment Options\n\n- Auto-pay (recommended)\n- Online portal\n- Bank transfer\n- Mobile payment apps\n\n## Need Help?\n\nContact our billing support team if you have questions about your bill.',
  'Learn how to read and understand your monthly Maskom Network bill, including all charges and payment options.',
  (SELECT id FROM kb_categories WHERE slug = 'account-billing'),
  (SELECT id FROM auth.users LIMIT 1),
  'published',
  false,
  3,
  'beginner',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Create search function for knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
  search_query TEXT,
  category_slug TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  category_name TEXT,
  category_slug TEXT,
  content TEXT,
  tags TEXT[],
  reading_time_minutes INTEGER,
  difficulty_level TEXT,
  view_count INTEGER,
  helpful_count INTEGER,
  published_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.slug,
    a.excerpt,
    c.name as category_name,
    c.slug as category_slug,
    a.content,
    a.tags,
    a.reading_time_minutes,
    a.difficulty_level,
    a.view_count,
    a.helpful_count,
    a.published_at,
    ts_rank(
      to_tsvector('english', a.title || ' ' || COALESCE(a.excerpt, '') || ' ' || COALESCE(a.content, '') || ' ' || array_to_string(a.tags, ' ')),
      plainto_tsquery('english', search_query)
    ) * a.search_rank as rank
  FROM kb_articles a
  JOIN kb_categories c ON a.category_id = c.id
  WHERE 
    a.status = 'published'
    AND (
      to_tsvector('english', a.title || ' ' || COALESCE(a.excerpt, '') || ' ' || COALESCE(a.content, '') || ' ' || array_to_string(a.tags, ' ')) @@ plainto_tsquery('english', search_query)
    )
    AND (category_slug IS NULL OR c.slug = category_slug)
    AND c.is_active = true
  ORDER BY rank DESC, a.featured DESC, a.view_count DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;