-- Step 2.1b: Create Basic RLS Policies for Tenant Isolation
-- Execute this script in Supabase SQL Editor

-- First, let's create a helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM users 
    WHERE auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants table policies (users can only see their own tenant)x
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT USING (id = get_current_user_tenant_id());

CREATE POLICY "Admins can update their own tenant" ON tenants
  FOR UPDATE USING (
    id = get_current_user_tenant_id() 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Users table policies (users can access users in their tenant)
CREATE POLICY "Users can view users in their tenant" ON users
  FOR SELECT USING (tenant_id = get_current_user_tenant_id());

CREATE POLICY "Admins can manage users in their tenant" ON users
  FOR ALL USING (
    tenant_id = get_current_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND tenant_id = get_current_user_tenant_id()
    )
  );

-- Patients table policies (tenant isolation)
CREATE POLICY "Users can access patients in their tenant" ON patients
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Appointments table policies (tenant isolation)
CREATE POLICY "Users can access appointments in their tenant" ON appointments
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Consultations table policies (tenant isolation)
CREATE POLICY "Users can access consultations in their tenant" ON consultations
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Prescriptions table policies (tenant isolation)
CREATE POLICY "Users can access prescriptions in their tenant" ON prescriptions
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Lab orders table policies (tenant isolation)
CREATE POLICY "Users can access lab orders in their tenant" ON lab_orders
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Lab results table policies (tenant isolation)
CREATE POLICY "Users can access lab results in their tenant" ON lab_results
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Follow-ups table policies (tenant isolation)
CREATE POLICY "Users can access follow-ups in their tenant" ON follow_ups
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Bills table policies (tenant isolation)
CREATE POLICY "Users can access bills in their tenant" ON bills
  FOR ALL USING (tenant_id = get_current_user_tenant_id());

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
