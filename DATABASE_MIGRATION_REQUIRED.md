# 🚨 URGENT: Database Migration Required

## The calendar system requires new columns in the `patient_visits` table.

### 📋 **SQL Commands to Run in Supabase Dashboard**

Please run these commands in your Supabase SQL Editor to add the missing columns:

```sql
-- Add appointment scheduling columns to patient_visits table
ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS scheduled_time time;
ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30;
ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS appointment_status text DEFAULT 'scheduled';
ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS appointment_source text DEFAULT 'manual';

-- Add constraints for appointment status
ALTER TABLE patient_visits ADD CONSTRAINT IF NOT EXISTS patient_visits_appointment_status_check
CHECK (appointment_status IN ('scheduled', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'));

-- Add constraint for appointment source
ALTER TABLE patient_visits ADD CONSTRAINT IF NOT EXISTS patient_visits_appointment_source_check
CHECK (appointment_source IN ('manual', 'online', 'whatsapp', 'phone'));

-- Create appointment_slots table for 15-minute precision
CREATE TABLE IF NOT EXISTS appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  doctor_id uuid NOT NULL REFERENCES users(id),
  patient_id uuid REFERENCES patients(id),
  visit_id uuid REFERENCES patient_visits(id),
  appointment_id uuid,

  -- Slot timing
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  duration_minutes integer DEFAULT 15,

  -- Availability status
  is_available boolean DEFAULT true,
  is_booked boolean DEFAULT false,
  is_blocked boolean DEFAULT false,
  block_reason text,

  -- Booking details
  booking_notes text,
  special_requirements text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),

  -- Indexes for performance
  UNIQUE(doctor_id, slot_date, slot_time, tenant_id)
);

-- Add RLS policies for appointment_slots
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_slots_tenant_isolation" ON appointment_slots
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.tenant_id = appointment_slots.tenant_id
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_slots_doctor_date ON appointment_slots(doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_appointment_slots_patient ON appointment_slots(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_scheduled ON patient_visits(scheduled_date, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_patient_visits_doctor_date ON patient_visits(doctor_id, scheduled_date);

-- Update existing patient_visits to have some appointment data
UPDATE patient_visits
SET
  scheduled_date = visit_date,
  scheduled_time = COALESCE(visit_time, '09:00'::time),
  duration_minutes = 30,
  appointment_status = CASE
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'cancelled'
    WHEN status = 'in_progress' THEN 'in_progress'
    ELSE 'scheduled'
  END,
  appointment_source = 'manual'
WHERE scheduled_date IS NULL;
```

### 🔗 **How to Run This:**

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Go to your project: `vflnlornzaqigcqegqif`
3. Navigate to **SQL Editor**
4. Copy and paste the SQL commands above
5. Click **Run** to execute

### ✅ **After Running the Migration:**

The calendar will work correctly with:

- ✅ 15-minute appointment precision
- ✅ Visual calendar interface
- ✅ Click-to-schedule functionality
- ✅ Appointment status tracking
- ✅ Multi-doctor coordination

### 📱 **Access Points:**

Once the migration is complete, access the calendar at:

- **Test Page**: `http://localhost:3000/test/calendar`
- **Main Dashboard**: `http://localhost:3000/dashboard/calendar`
- **Dashboard Navigation**: Click "📅 Appointment Calendar" from main dashboard

This migration is safe and backward-compatible - it only adds new columns and doesn't modify existing data.
