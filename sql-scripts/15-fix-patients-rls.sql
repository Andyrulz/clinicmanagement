-- Fix RLS policies for patients table
-- Run this script to ensure proper Row Level Security

-- 1. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view patients for their tenant" ON patients;
DROP POLICY IF EXISTS "Users can insert patients for their tenant" ON patients;
DROP POLICY IF EXISTS "Users can update patients for their tenant" ON patients;

-- 2. Create proper RLS policies for patients
CREATE POLICY "Users can view patients for their tenant" ON patients
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert patients for their tenant" ON patients
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update patients for their tenant" ON patients
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- 3. Ensure RLS is enabled on patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions
GRANT ALL ON patients TO authenticated;
