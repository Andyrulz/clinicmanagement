-- Cleanup Script: Delete test data to restart signup flow
-- Execute this in Supabase SQL Editor

-- IMPORTANT: Replace 'your-email@example.com' with your actual email address
-- This will delete ALL data associated with your test account

-- First, let's see what we have
SELECT 'Current Auth Users:' as info;
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'your-email@example.com';  -- REPLACE WITH YOUR EMAIL

SELECT 'Current App Users:' as info;
SELECT u.id, u.email, u.full_name, u.role, t.name as clinic_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'your-email@example.com';  -- REPLACE WITH YOUR EMAIL

-- Delete records (uncomment the lines below after replacing the email)

-- Delete from users table first (due to foreign key constraints)
-- DELETE FROM users WHERE email = 'your-email@example.com';

-- Delete from tenants table (if you want to remove the clinic too)
-- DELETE FROM tenants WHERE id IN (
--   SELECT tenant_id FROM users WHERE email = 'your-email@example.com'
-- );

-- Delete from auth.users (this will also remove the authentication)
-- DELETE FROM auth.users WHERE email = 'your-email@example.com';

-- Verify cleanup (should return no rows)
-- SELECT 'After cleanup - Auth Users:' as info;
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- SELECT 'After cleanup - App Users:' as info;  
-- SELECT id, email FROM users WHERE email = 'your-email@example.com';
