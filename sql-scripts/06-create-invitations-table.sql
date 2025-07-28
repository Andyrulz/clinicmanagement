-- Create invitations table for multi-user tenant system
-- Execute this in Supabase SQL Editor

-- First, create the user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'doctor', 'receptionist', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NULL,
  accepted_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);

-- Add RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations (simplified to avoid recursion)
CREATE POLICY "Authenticated users can view invitations in their tenant" ON invitations
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create invitations" ON invitations
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invitations" ON invitations
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invitations" ON invitations
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Allow public access to validate invitation tokens (for signup flow)
CREATE POLICY "Anyone can view invitations by token" ON invitations
  FOR SELECT 
  USING (token IS NOT NULL AND expires_at > NOW() AND accepted_at IS NULL);

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to create invitation with auto-generated token
CREATE OR REPLACE FUNCTION create_invitation(
  p_tenant_id UUID,
  p_email VARCHAR(255),
  p_role user_role,
  p_invited_by UUID,
  p_expires_in_hours INTEGER DEFAULT 72
)
RETURNS TABLE(invitation_id UUID, invitation_token TEXT) AS $$
DECLARE
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  -- Generate unique token
  LOOP
    v_token := generate_invitation_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invitations WHERE token = v_token);
  END LOOP;
  
  -- Create invitation
  INSERT INTO invitations (
    tenant_id, 
    email, 
    role, 
    invited_by, 
    token, 
    expires_at
  ) VALUES (
    p_tenant_id,
    p_email,
    p_role,
    p_invited_by,
    v_token,
    NOW() + (p_expires_in_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO v_invitation_id;
  
  RETURN QUERY SELECT v_invitation_id, v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate role assignments (security layer)
CREATE OR REPLACE FUNCTION validate_role_assignment(
  p_current_user_auth_id UUID,
  p_target_role user_role,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user_role user_role;
BEGIN
  -- Get current user's role
  SELECT role INTO v_current_user_role
  FROM users 
  WHERE auth_user_id = p_current_user_auth_id 
  AND tenant_id = p_tenant_id;
  
  -- If no user found, deny
  IF v_current_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Role assignment rules:
  -- 1. Only admins can assign admin role
  -- 2. Only admins/managers can assign manager role  
  -- 3. Admins/managers can assign any lower role
  
  CASE p_target_role
    WHEN 'admin' THEN
      RETURN v_current_user_role = 'admin';
    WHEN 'manager' THEN
      RETURN v_current_user_role IN ('admin', 'manager');
    ELSE
      RETURN v_current_user_role IN ('admin', 'manager');
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced create_invitation function with role validation
CREATE OR REPLACE FUNCTION create_invitation_secure(
  p_tenant_id UUID,
  p_email VARCHAR(255),
  p_role user_role,
  p_invited_by UUID,
  p_expires_in_hours INTEGER DEFAULT 72
)
RETURNS TABLE(invitation_id UUID, invitation_token TEXT) AS $$
DECLARE
  v_token TEXT;
  v_invitation_id UUID;
  v_current_user_auth_id UUID;
BEGIN
  -- Get the auth_user_id of the person creating the invitation
  SELECT auth_user_id INTO v_current_user_auth_id
  FROM users 
  WHERE id = p_invited_by;
  
  -- Validate role assignment permissions
  IF NOT validate_role_assignment(v_current_user_auth_id, p_role, p_tenant_id) THEN
    RAISE EXCEPTION 'Insufficient permissions to assign role: %', p_role;
  END IF;
  
  -- Generate unique token
  LOOP
    v_token := generate_invitation_token();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invitations WHERE token = v_token);
  END LOOP;
  
  -- Create invitation
  INSERT INTO invitations (
    tenant_id, 
    email, 
    role, 
    invited_by, 
    token, 
    expires_at
  ) VALUES (
    p_tenant_id,
    p_email,
    p_role,
    p_invited_by,
    v_token,
    NOW() + (p_expires_in_hours || ' hours')::INTERVAL
  )
  RETURNING id INTO v_invitation_id;
  
  RETURN QUERY SELECT v_invitation_id, v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify table creation
SELECT 'Invitations table created successfully!' as result;
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Function to prevent direct role changes (additional security)
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_old_role user_role;
  v_current_user_role user_role;
BEGIN
  -- For updates, check if role is being changed
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    
    -- Get current user's role in the same tenant
    SELECT role INTO v_current_user_role
    FROM users 
    WHERE auth_user_id = auth.uid() 
    AND tenant_id = NEW.tenant_id;
    
    -- Only admins can change roles
    IF v_current_user_role != 'admin' THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
    
    -- Admins cannot demote themselves (prevent lockout)
    IF OLD.auth_user_id = auth.uid() AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
      -- Check if there are other admins in the tenant
      IF (SELECT COUNT(*) FROM users WHERE tenant_id = NEW.tenant_id AND role = 'admin' AND id != NEW.id) = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last admin from the tenant';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent unauthorized role changes
DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON users;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

SELECT 'Security functions and triggers created successfully!' as result;
