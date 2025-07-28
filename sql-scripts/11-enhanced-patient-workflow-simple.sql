-- Enhanced Patient Management Schema - Simplified for Manual Execution
-- Copy and paste this into Supabase SQL Editor

-- 1. Update patients table for phone-based uniqueness and registration fee
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_tenant_id_uhid_key;
ALTER TABLE patients ADD CONSTRAINT IF NOT EXISTS patients_tenant_phone_unique UNIQUE (tenant_id, phone);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS registration_payment_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked'));

-- 2. Create patient_visits table
CREATE TABLE IF NOT EXISTS patient_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_number VARCHAR(50) UNIQUE NOT NULL,
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_time TIME DEFAULT CURRENT_TIME,
  visit_type VARCHAR(20) DEFAULT 'new' CHECK (visit_type IN ('new', 'follow-up', 'emergency')),
  consultation_fee DECIMAL(10,2) NOT NULL,
  consultation_fee_paid BOOLEAN DEFAULT false,
  payment_method VARCHAR(30),
  payment_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked-in', 'vitals-pending', 'vitals-done', 'in-consultation', 'consultation-done', 'completed', 'cancelled', 'no-show')),
  chief_complaint TEXT,
  visit_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 3. Create patient_vitals table
CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  bmi DECIMAL(4,2),
  pulse_rate INTEGER,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  spo2 INTEGER,
  temperature DECIMAL(4,2),
  temperature_unit VARCHAR(1) DEFAULT 'C' CHECK (temperature_unit IN ('C', 'F')),
  respiratory_rate INTEGER,
  blood_sugar DECIMAL(5,2),
  measured_by UUID REFERENCES users(id),
  notes TEXT,
  is_validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_patient_visits_tenant ON patient_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_doctor_date ON patient_visits(doctor_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_visit ON patient_vitals(visit_id);

-- 5. Enable RLS
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can access visits from their tenant" ON patient_visits FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY IF NOT EXISTS "Users can access vitals from their tenant" ON patient_vitals FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 7. Grant permissions
GRANT ALL ON patient_visits TO authenticated;
GRANT ALL ON patient_vitals TO authenticated;

-- Schema ready for patient management system!
