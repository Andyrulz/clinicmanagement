-- Fix infinite recursion in users table RLS policies
-- The issue: policies are referencing the same table they're protecting
-- Solution: Use simpler policies that avoid recursion
-- Execute this in Supabase SQL Editor

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in same tenant" ON users;

-- Check what policies currently exist
SELECT 'Current policies before fix:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- Create a simpler policy that allows authenticated users to view users
-- This avoids recursion by not querying the users table within the policy
CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- For INSERT, keep the existing policy that only allows users to create their own record
-- (This should already exist and be working)

-- For UPDATE, allow users to update their own record
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE 
  USING (auth_user_id = auth.uid());

-- Verify the new policies
SELECT 'New policies after fix:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;
