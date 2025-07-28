-- Check what data we actually have
-- Execute this in Supabase SQL Editor

-- 1. Check auth.users table (managed by Supabase Auth)
SELECT 'Auth Users (Supabase managed):' as info;
SELECT id, email, email_confirmed_at, created_at, user_metadata
FROM auth.users 
ORDER BY created_at DESC;

-- 2. Check our custom users table (empty - this is why setup is needed)
SELECT 'App Users (our custom table):' as info;
SELECT id, email, full_name, role, tenant_id, auth_user_id
FROM users;

-- 3. Check tenants table (also empty)
SELECT 'Tenants (our custom table):' as info;
SELECT id, name, slug, created_at
FROM tenants;

-- 4. Show the connection that's missing
SELECT 'Missing Connection:' as info;
SELECT 
    au.email as auth_email,
    au.id as auth_id,
    u.id as app_user_id,
    u.role as user_role,
    t.name as clinic_name
FROM auth.users au
LEFT JOIN users u ON au.id = u.auth_user_id  -- This JOIN will be NULL
LEFT JOIN tenants t ON u.tenant_id = t.id     -- This will also be NULL
ORDER BY au.created_at DESC;
