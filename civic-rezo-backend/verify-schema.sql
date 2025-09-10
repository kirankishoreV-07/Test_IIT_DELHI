-- SQL script to verify database schema and constraints for Civic Rezo
-- Run this in the Supabase SQL Editor to check your setup

-- Check users table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns 
WHERE 
  table_name = 'users'
ORDER BY 
  ordinal_position;

-- Check complaints table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns 
WHERE 
  table_name = 'complaints'
ORDER BY 
  ordinal_position;

-- Check foreign key constraints
SELECT
  tc.table_schema, 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE 
  tc.constraint_type = 'FOREIGN KEY' AND
  tc.table_name = 'complaints';

-- Check if demo user exists
SELECT 
  id, 
  email, 
  full_name, 
  user_type
FROM 
  users
WHERE 
  email = 'demo@civicrezo.org';

-- Check if any complaints are associated with the demo user
SELECT 
  c.id,
  c.title,
  c.category,
  c.status,
  c.created_at,
  u.email as user_email
FROM 
  complaints c
JOIN 
  users u ON c.user_id = u.id
WHERE 
  u.email = 'demo@civicrezo.org'
LIMIT 
  10;

-- Check for any complaints with invalid user references
SELECT 
  c.id,
  c.title,
  c.user_id
FROM 
  complaints c
LEFT JOIN 
  users u ON c.user_id = u.id
WHERE 
  u.id IS NULL
LIMIT 
  10;
