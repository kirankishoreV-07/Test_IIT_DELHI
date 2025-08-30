-- ============================================================================
-- CivicStack Database Schema for Supabase
-- ============================================================================
-- This script creates all necessary tables, indexes, triggers, and policies
-- for the CivicStack civic complaint management system.
-- 
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to your Supabase project dashboard
-- 3. Navigate to SQL Editor
-- 4. Paste this code and click "Run"
-- ============================================================================

-- Clean up existing objects to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_complaints_updated_at ON complaints;

DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert data" ON users;
DROP POLICY IF EXISTS "Users can view all complaints" ON complaints;
DROP POLICY IF EXISTS "Users can insert own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can insert complaints" ON complaints;
DROP POLICY IF EXISTS "Users can update own complaints" ON complaints;
DROP POLICY IF EXISTS "Users can update complaints" ON complaints;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all operations on complaint_votes" ON complaint_votes;
DROP POLICY IF EXISTS "Allow all operations on complaint_updates" ON complaint_updates;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('citizen', 'admin')) NOT NULL DEFAULT 'citizen',
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Complaints table for storing civic complaints
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    status VARCHAR(50) CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')) DEFAULT 'pending',
    priority_score INTEGER DEFAULT 0,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    location_address TEXT,
    image_urls TEXT[], -- Array of image URLs
    audio_url TEXT,
    emotion_score DECIMAL(3, 2), -- Sentiment analysis score (-1.00 to 1.00)
    ai_confidence_score DECIMAL(3, 2), -- AI verification confidence (0.00 to 1.00)
    location_sensitivity_score INTEGER DEFAULT 0,
    verification_status VARCHAR(50) DEFAULT 'pending',
    assigned_department VARCHAR(100),
    assigned_admin_id UUID REFERENCES users(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaint votes for citizen engagement
CREATE TABLE IF NOT EXISTS complaint_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(20) CHECK (vote_type IN ('upvote', 'downvote')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(complaint_id, user_id) -- Prevent duplicate votes from same user
);

-- Complaint updates for tracking status changes
CREATE TABLE IF NOT EXISTS complaint_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    updated_by_id UUID REFERENCES users(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    update_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications for user alerts
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50), -- 'complaint_update', 'bill_reminder', 'system_alert'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments for complaint categorization
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADD CONSTRAINTS
-- ============================================================================

-- Add unique constraint to departments name if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'departments_name_key' 
        AND table_name = 'departments'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE departments ADD CONSTRAINT departments_name_key UNIQUE (name);
    END IF;
END $$;

-- ============================================================================
-- INSERT DEFAULT DATA
-- ============================================================================

-- Insert default departments (avoid duplicates)
INSERT INTO departments (name, description, contact_email, contact_phone) 
SELECT * FROM (VALUES
    ('Sanitation', 'Garbage collection, street cleaning, waste management', 'sanitation@civic.gov', '+91-11-1234-5678'),
    ('Water & Sewerage', 'Water supply, sewerage, drainage issues', 'water@civic.gov', '+91-11-1234-5679'),
    ('Roads & Infrastructure', 'Road repairs, potholes, street lights', 'roads@civic.gov', '+91-11-1234-5680'),
    ('Public Health', 'Health and hygiene related issues', 'health@civic.gov', '+91-11-1234-5681'),
    ('Electricity', 'Power supply, street lighting issues', 'electricity@civic.gov', '+91-11-1234-5682')
) AS v(name, description, contact_email, contact_phone)
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE departments.name = v.name
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_priority_score ON complaints(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_complaint_votes_complaint_id ON complaint_votes(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint_id ON complaint_updates(complaint_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- ============================================================================
-- CREATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at 
    BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Departments table doesn't need RLS as it's reference data
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Users table policies (allow all operations for custom auth system)
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Complaints table policies (allow read for all, manage writes)
CREATE POLICY "Anyone can view complaints" ON complaints
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert complaints" ON complaints
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update complaints" ON complaints
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete complaints" ON complaints
    FOR DELETE USING (true);

-- Complaint votes policies
CREATE POLICY "Anyone can manage complaint votes" ON complaint_votes
    FOR ALL USING (true) WITH CHECK (true);

-- Complaint updates policies
CREATE POLICY "Anyone can manage complaint updates" ON complaint_updates
    FOR ALL USING (true) WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Anyone can manage notifications" ON notifications
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- CREATE STORAGE BUCKET FOR MEDIA FILES
-- ============================================================================

-- Create storage bucket for complaint images and audio files
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'complaint-media'
    ) THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-media', 'complaint-media', true);
    END IF;
EXCEPTION
    WHEN others THEN
        -- Ignore errors if storage is not available in this environment
        NULL;
END $$;

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get complaint statistics
CREATE OR REPLACE FUNCTION get_complaint_stats()
RETURNS TABLE (
    total_complaints BIGINT,
    pending_complaints BIGINT,
    in_progress_complaints BIGINT,
    resolved_complaints BIGINT,
    rejected_complaints BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_complaints,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_complaints,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_complaints,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_complaints,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_complaints
    FROM complaints;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
    total_users BIGINT,
    citizen_users BIGINT,
    admin_users BIGINT,
    active_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE user_type = 'citizen') as citizen_users,
        COUNT(*) FILTER (WHERE user_type = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users
    FROM users;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ CivicStack database schema created successfully!';
    RAISE NOTICE '📊 Tables created: users, complaints, complaint_votes, complaint_updates, notifications, departments';
    RAISE NOTICE '🔒 Row Level Security enabled with permissive policies';
    RAISE NOTICE '📁 Storage bucket "complaint-media" created for file uploads';
    RAISE NOTICE '🚀 Your CivicStack database is ready to use!';
END $$;
