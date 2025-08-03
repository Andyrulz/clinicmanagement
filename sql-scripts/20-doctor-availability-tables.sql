-- Doctor Availability & Calendar Management System
-- SQL Script for database tables and functions
-- Date: August 2, 2025
-- Note: Basic tables (tenants, users, patients, patient_visits) already exist

-- =================================================================
-- STEP 1: CREATE DOCTOR_AVAILABILITY TABLE
-- =================================================================

-- Doctor availability schedule table
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Schedule Definition
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Slot Configuration
  slot_duration_minutes INTEGER DEFAULT 30 CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 480),
  buffer_time_minutes INTEGER DEFAULT 5 CHECK (buffer_time_minutes >= 0 AND buffer_time_minutes <= 60),
  max_patients_per_slot INTEGER DEFAULT 1 CHECK (max_patients_per_slot > 0),
  
  -- Availability Status
  is_active BOOLEAN DEFAULT true,
  availability_type VARCHAR(20) DEFAULT 'regular' CHECK (availability_type IN ('regular', 'special', 'break', 'unavailable')),
  
  -- Date Range (for special schedules/leaves)
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
  -- Note: Doctor role validation is handled at the application level
);

-- =================================================================
-- STEP 2: CREATE DOCTOR_TIME_SLOTS TABLE
-- =================================================================

-- Generated time slots for efficient querying and booking
CREATE TABLE IF NOT EXISTS doctor_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  availability_id UUID REFERENCES doctor_availability(id) ON DELETE CASCADE NOT NULL,
  
  -- Slot Details
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Booking Status
  is_available BOOLEAN DEFAULT true,
  is_booked BOOLEAN DEFAULT false,
  current_bookings INTEGER DEFAULT 0,
  max_bookings INTEGER DEFAULT 1,
  
  -- References
  visit_id UUID REFERENCES patient_visits(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, slot_date, start_time),
  CONSTRAINT valid_bookings CHECK (current_bookings >= 0 AND current_bookings <= max_bookings),
  CONSTRAINT valid_slot_status CHECK (
    (is_booked = true AND current_bookings > 0) OR 
    (is_booked = false AND current_bookings = 0)
  )
);

-- =================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =================================================================

-- Indexes for doctor_availability
CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor_day ON doctor_availability(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_tenant ON doctor_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_active ON doctor_availability(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_doctor_availability_dates ON doctor_availability(effective_from, effective_until);

-- Prevent overlapping schedules for same doctor/day (commented out for now - will add after testing)
-- CREATE UNIQUE INDEX idx_doctor_availability_no_overlap ON doctor_availability(
--   doctor_id, day_of_week, start_time, end_time
-- ) WHERE is_active = true;

-- Indexes for doctor_time_slots
CREATE INDEX IF NOT EXISTS idx_doctor_slots_date_doctor ON doctor_time_slots(slot_date, doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_slots_available ON doctor_time_slots(is_available, slot_date) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_doctor_slots_visit ON doctor_time_slots(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_doctor_slots_tenant_date ON doctor_time_slots(tenant_id, slot_date);

-- =================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =================================================================

-- Enable RLS on doctor_availability
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;

-- Enable RLS on doctor_time_slots
ALTER TABLE doctor_time_slots ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 5: CREATE RLS POLICIES
-- =================================================================

-- Policy for doctor_availability: Doctors can view and edit their own availability, admins can manage all
DROP POLICY IF EXISTS "Doctor availability access" ON doctor_availability;
CREATE POLICY "Doctor availability access" ON doctor_availability
  FOR ALL TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    ) AND (
      doctor_id = (
        SELECT id FROM users 
        WHERE auth_user_id = auth.uid()
      ) OR
      (
        SELECT role FROM users 
        WHERE auth_user_id = auth.uid()
      ) IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    ) AND (
      doctor_id = (
        SELECT id FROM users 
        WHERE auth_user_id = auth.uid()
      ) OR
      (
        SELECT role FROM users 
        WHERE auth_user_id = auth.uid()
      ) IN ('admin', 'manager')
    )
  );

-- Policy for doctor_time_slots: Users can view time slots in their tenant
DROP POLICY IF EXISTS "Time slots view access" ON doctor_time_slots;
CREATE POLICY "Time slots view access" ON doctor_time_slots
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for doctor_time_slots: Receptionists and admins can book/modify slots
DROP POLICY IF EXISTS "Time slots booking access" ON doctor_time_slots;
CREATE POLICY "Time slots booking access" ON doctor_time_slots
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    ) AND
    (
      SELECT role FROM users 
      WHERE auth_user_id = auth.uid()
    ) IN ('admin', 'manager', 'receptionist')
  )
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    ) AND
    (
      SELECT role FROM users 
      WHERE auth_user_id = auth.uid()
    ) IN ('admin', 'manager', 'receptionist')
  );

-- Policy for doctor_time_slots: Allow inserts for system-generated slots
DROP POLICY IF EXISTS "Time slots insert access" ON doctor_time_slots;
CREATE POLICY "Time slots insert access" ON doctor_time_slots
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- =================================================================
-- COMPLETION MESSAGE
-- =================================================================

-- Add a comment to track completion
COMMENT ON TABLE doctor_availability IS 'Doctor availability schedules - Created August 2, 2025';
COMMENT ON TABLE doctor_time_slots IS 'Generated time slots for booking - Created August 2, 2025';

-- Show created tables
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN ('doctor_availability', 'doctor_time_slots')
ORDER BY tablename;
