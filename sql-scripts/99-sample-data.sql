-- Sample data for testing the visit management system
-- Note: Replace 'your-tenant-id' with your actual tenant ID

-- Sample patients
INSERT INTO patients (
  tenant_id,
  first_name,
  last_name,
  phone,
  uhid,
  age,
  gender,
  registration_fee,
  registration_fee_paid,
  status
) VALUES 
(
  'your-tenant-id',
  'John',
  'Doe',
  '1234567890',
  'UHID001',
  35,
  'male',
  500,
  true,
  'active'
),
(
  'your-tenant-id',
  'Jane',
  'Smith',
  '2345678901',
  'UHID002',
  28,
  'female',
  500,
  true,
  'active'
),
(
  'your-tenant-id',
  'Robert',
  'Johnson',
  '3456789012',
  'UHID003',
  45,
  'male',
  500,
  true,
  'active'
);

-- Sample users with doctor role
INSERT INTO users (
  tenant_id,
  full_name,
  email,
  role,
  is_active
) VALUES
(
  'your-tenant-id',
  'Dr. Sarah Wilson',
  'dr.sarah@clinic.com',
  'doctor',
  true
),
(
  'your-tenant-id',
  'Dr. Michael Chen',
  'dr.michael@clinic.com',
  'doctor',
  true
),
(
  'your-tenant-id',
  'Dr. Emily Davis',
  'dr.emily@clinic.com',
  'doctor',
  true
);

-- Instructions:
-- 1. Get your tenant_id by running: SELECT id FROM tenants LIMIT 1;
-- 2. Replace 'your-tenant-id' with the actual tenant ID
-- 3. Run this script in your Supabase SQL editor
