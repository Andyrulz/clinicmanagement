-- Fix users table RLS to allow viewing users in same tenant
-- This is needed for admin/managers to see doctors, staff, etc.
-- Execute this in Supabase SQL Editor

-- First check current policies
SELECT 'Current policies on users table:' as info;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Add policy to allow users to view other users in their tenant
CREATE POLICY "Users can view users in same tenant" ON users
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND 
    tenant_id = (
      SELECT u.tenant_id 
      FROM users u 
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Verify the new policy was created
SELECT 'New policies on users table:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
