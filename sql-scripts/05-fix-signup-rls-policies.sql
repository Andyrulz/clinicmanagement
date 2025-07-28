-- Fix RLS policies to prevent infinite recursion during signup
-- The issue: get_current_user_tenant_id() function queries users table,
-- but users table policies also call this function = infinite recursion
-- Solution: Use direct EXISTS queries instead of the helper function
-- Execute this in Supabase SQL Editor

-- First, let's see current policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('tenants', 'users')
ORDER BY tablename, policyname;

-- Drop ALL existing policies for clean slate
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
DROP POLICY IF EXISTS "Admins can update their own tenant" ON tenants;

DROP POLICY IF EXISTS "Authenticated users can create user records" ON users;
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can view users in same tenant" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Admins can manage users in their tenant" ON users;

-- Create new policies that avoid recursion during signup

-- Tenants table: Allow authenticated users to create and view their own tenant
CREATE POLICY "Authenticated users can create tenants" ON tenants
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND (
      -- Direct lookup without function to avoid recursion
      EXISTS (
        SELECT 1 FROM users 
        WHERE auth_user_id = auth.uid() 
        AND tenant_id = tenants.id
      ) OR
      -- Allow during signup when user record doesn't exist yet
      NOT EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can update their own tenant" ON tenants
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND tenant_id = tenants.id
      AND role = 'admin'
    )
  );

-- Users table: Simplified policies that avoid ALL recursion
CREATE POLICY "Authenticated users can create user records" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND auth_user_id = auth.uid());

CREATE POLICY "Users can view their own record" ON users
  FOR SELECT 
  USING (auth.uid() IS NOT NULL AND auth_user_id = auth.uid());

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE 
  USING (auth_user_id = auth.uid());

-- Verify new policies
SELECT 'New Policies Created:' as info;
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('tenants', 'users')
ORDER BY tablename, policyname;
