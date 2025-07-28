-- Sample doctor data for testing
-- Replace 'YOUR_TENANT_ID' with your actual tenant ID: ff8b835e-e3ef-493c-868e-5cc5b557cf53
-- Execute these INSERT statements in Supabase SQL Editor

-- Insert sample doctors (these will not have auth_user_id, so they're just data records)
INSERT INTO "public"."users" (
  "id", 
  "tenant_id", 
  "email", 
  "full_name", 
  "role", 
  "phone", 
  "is_active", 
  "auth_user_id", 
  "created_at", 
  "updated_at"
) VALUES 
-- Doctor 1: Dr. Sarah Johnson
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'sarah.johnson@clinic.com',
  'Dr. Sarah Johnson',
  'doctor',
  '+919876543210',
  true,
  NULL,
  NOW(),
  NOW()
),
-- Doctor 2: Dr. Michael Chen
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'michael.chen@clinic.com',
  'Dr. Michael Chen',
  'doctor',
  '+919876543211',
  true,
  NULL,
  NOW(),
  NOW()
),
-- Doctor 3: Dr. Priya Sharma
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'priya.sharma@clinic.com',
  'Dr. Priya Sharma',
  'doctor',
  '+919876543212',
  true,
  NULL,
  NOW(),
  NOW()
);

-- Verify the insertions
SELECT 
  id,
  full_name,
  email,
  role,
  is_active,
  tenant_id,
  created_at
FROM users 
WHERE tenant_id = 'ff8b835e-e3ef-493c-868e-5cc5b557cf53'
ORDER BY role, full_name;
