-- Additional security functions for role management
-- Execute this in Supabase SQL Editor after the invitations table is created

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

-- Function to check tenant admin count (utility)
CREATE OR REPLACE FUNCTION get_tenant_admin_count(p_tenant_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER 
    FROM users 
    WHERE tenant_id = p_tenant_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Security functions created successfully!' as result;
