-- Quick database check for calendar functionality
-- Run this in Supabase SQL Editor to troubleshoot calendar issues

-- 1. Check if we have doctors
SELECT 'DOCTORS' as check_type, count(*) as count, array_agg(full_name) as names
FROM users 
WHERE role = 'doctor' AND is_active = true;

-- 2. Check if doctor_availability table exists and has data
SELECT 'AVAILABILITY TABLE' as check_type, count(*) as count
FROM doctor_availability;

-- 3. Check specific doctor availability data
SELECT 'AVAILABILITY DATA' as check_type, 
       u.full_name as doctor_name,
       da.day_of_week,
       da.start_time,
       da.end_time,
       da.is_active
FROM doctor_availability da
JOIN users u ON da.doctor_id = u.id
WHERE da.is_active = true
ORDER BY u.full_name, da.day_of_week;

-- 4. Check if we have patient visits (appointments)
SELECT 'APPOINTMENTS' as check_type, count(*) as count
FROM patient_visits
WHERE visit_date >= CURRENT_DATE - INTERVAL '1 week';

-- 5. Get tenant_id for reference
SELECT 'TENANT_ID' as check_type, id as tenant_id
FROM tenants
LIMIT 1;

-- If no availability data is found, run this to create sample data:
-- Replace DOCTOR_ID with actual doctor ID from step 1

/*
INSERT INTO doctor_availability (
  id, tenant_id, doctor_id, day_of_week, start_time, end_time, 
  is_active, effective_from, effective_until, slot_duration_minutes, max_patients_per_slot
) 
SELECT 
  gen_random_uuid(),
  'ff8b835e-e3ef-493c-868e-5cc5b557cf53', -- Replace with your tenant_id
  'DOCTOR_ID', -- Replace with actual doctor ID
  generate_series(1, 5), -- Monday to Friday
  '09:00',
  '17:00',
  true,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  30,
  1;
*/
