-- Sample doctor availability data for testing calendar functionality
-- This script creates availability schedules for existing doctors
-- Date: August 4, 2025

-- Replace with your actual tenant_id: ff8b835e-e3ef-493c-868e-5cc5b557cf53

-- First, let's check if we have doctors in the system
-- Run this first to get doctor IDs:
-- SELECT id, full_name FROM users WHERE role = 'doctor' AND tenant_id = 'ff8b835e-e3ef-493c-868e-5cc5b557cf53';

-- Sample doctor availability for Dr. Sarah Johnson (Monday to Friday, 9 AM to 5 PM)
-- Replace 'DOCTOR_ID_1' with actual doctor ID from the query above
INSERT INTO doctor_availability (
  id,
  tenant_id,
  doctor_id,
  day_of_week,
  start_time,
  end_time,
  is_active,
  effective_from,
  effective_until,
  break_start_time,
  break_end_time,
  slot_duration_minutes,
  max_patients_per_slot,
  created_at,
  updated_at
) VALUES 
-- Monday
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'DOCTOR_ID_1', -- Replace with actual doctor ID
  1, -- Monday
  '09:00',
  '17:00',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  '12:30',
  '13:30',
  30,
  1,
  NOW(),
  NOW()
),
-- Tuesday
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'DOCTOR_ID_1',
  2, -- Tuesday
  '09:00',
  '17:00',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  '12:30',
  '13:30',
  30,
  1,
  NOW(),
  NOW()
),
-- Wednesday
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'DOCTOR_ID_1',
  3, -- Wednesday
  '09:00',
  '17:00',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  '12:30',
  '13:30',
  30,
  1,
  NOW(),
  NOW()
),
-- Thursday
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'DOCTOR_ID_1',
  4, -- Thursday
  '09:00',
  '17:00',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  '12:30',
  '13:30',
  30,
  1,
  NOW(),
  NOW()
),
-- Friday
(
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53',
  'DOCTOR_ID_1',
  5, -- Friday
  '09:00',
  '17:00',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  '12:30',
  '13:30',
  30,
  1,
  NOW(),
  NOW()
);

-- Verify the data was inserted correctly:
-- SELECT da.*, u.full_name as doctor_name 
-- FROM doctor_availability da 
-- JOIN users u ON da.doctor_id = u.id 
-- WHERE da.tenant_id = 'ff8b835e-e3ef-493c-868e-5cc5b557cf53';

-- Instructions:
-- 1. First run: SELECT id, full_name FROM users WHERE role = 'doctor' AND tenant_id = 'ff8b835e-e3ef-493c-868e-5cc5b557cf53';
-- 2. Copy one of the doctor IDs from the result
-- 3. Replace 'DOCTOR_ID_1' in this script with the actual doctor ID
-- 4. Execute this script in Supabase SQL Editor
-- 5. The calendar should now show availability slots for that doctor
