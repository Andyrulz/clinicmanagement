-- Enhanced Patient Management Schema - Fixed PostgreSQL Syntax
-- Copy and paste this into Supabase SQL Editor

-- 1. Update patients table for phone-based uniqueness and registration fee
-- Drop existing constraint first
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'patients_tenant_id_uhid_key' 
               AND table_name = 'patients') THEN
        ALTER TABLE patients DROP CONSTRAINT patients_tenant_id_uhid_key;
    END IF;
END $$;

-- Add phone-based uniqueness constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'patients_tenant_phone_unique' 
                   AND table_name = 'patients') THEN
        ALTER TABLE patients ADD CONSTRAINT patients_tenant_phone_unique UNIQUE (tenant_id, phone);
    END IF;
END $$;

-- Add registration fee columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'registration_fee') THEN
        ALTER TABLE patients ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'registration_fee_paid') THEN
        ALTER TABLE patients ADD COLUMN registration_fee_paid BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'registration_payment_date') THEN
        ALTER TABLE patients ADD COLUMN registration_payment_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'patients' AND column_name = 'status') THEN
        ALTER TABLE patients ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        ALTER TABLE patients ADD CONSTRAINT patients_status_check CHECK (status IN ('active', 'inactive', 'blocked'));
    END IF;
END $$;

-- 2. Create patient_visits table
CREATE TABLE IF NOT EXISTS patient_visits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_number VARCHAR(50) UNIQUE NOT NULL,
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_time TIME DEFAULT CURRENT_TIME,
  visit_type VARCHAR(20) DEFAULT 'new' CHECK (visit_type IN ('new', 'follow_up')),
  consultation_fee DECIMAL(10,2) DEFAULT 0,
  consultation_fee_paid BOOLEAN DEFAULT false,
  consultation_payment_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  
  -- History and examination fields
  chief_complaints TEXT,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  physical_examination TEXT,
  clinical_findings TEXT,
  
  -- Diagnosis and treatment
  diagnosis TEXT,
  differential_diagnosis TEXT,
  treatment_plan TEXT,
  prescription JSONB, -- Store structured prescription data
  general_advice TEXT,
  follow_up_date DATE,
  follow_up_instructions TEXT,
  
  -- Tests and investigations
  tests_ordered JSONB, -- Store structured test orders
  scan_orders JSONB, -- Store structured scan orders
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- 3. Create patient_vitals table
CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE,
  
  -- Vital measurements
  height_cm DECIMAL(5,2), -- Height in centimeters
  weight_kg DECIMAL(5,2), -- Weight in kilograms
  bmi DECIMAL(4,2), -- Body Mass Index (calculated)
  pulse_rate INTEGER, -- Beats per minute
  blood_pressure_systolic INTEGER, -- mmHg
  blood_pressure_diastolic INTEGER, -- mmHg
  spo2 INTEGER, -- Oxygen saturation percentage
  temperature_celsius DECIMAL(4,2), -- Body temperature in Celsius
  
  -- Additional measurements
  respiratory_rate INTEGER, -- Breaths per minute
  blood_glucose DECIMAL(5,2), -- mg/dL
  notes TEXT, -- Additional notes about vitals
  
  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  recorded_by UUID REFERENCES users(id), -- Who recorded the vitals
  
  -- Constraints
  CONSTRAINT vitals_height_check CHECK (height_cm > 0 AND height_cm < 300),
  CONSTRAINT vitals_weight_check CHECK (weight_kg > 0 AND weight_kg < 500),
  CONSTRAINT vitals_bmi_check CHECK (bmi > 0 AND bmi < 100),
  CONSTRAINT vitals_pulse_check CHECK (pulse_rate > 0 AND pulse_rate < 300),
  CONSTRAINT vitals_bp_systolic_check CHECK (blood_pressure_systolic > 0 AND blood_pressure_systolic < 300),
  CONSTRAINT vitals_bp_diastolic_check CHECK (blood_pressure_diastolic > 0 AND blood_pressure_diastolic < 200),
  CONSTRAINT vitals_spo2_check CHECK (spo2 >= 0 AND spo2 <= 100),
  CONSTRAINT vitals_temp_check CHECK (temperature_celsius > 30 AND temperature_celsius < 45)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_visits_tenant_id ON patient_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient_id ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_doctor_id ON patient_visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_date ON patient_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_visits_status ON patient_visits(status);

CREATE INDEX IF NOT EXISTS idx_patient_vitals_tenant_id ON patient_vitals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient_id ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_visit_id ON patient_vitals(visit_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_at ON patient_vitals(recorded_at);

-- 5. Enable Row Level Security
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for patient_visits
CREATE POLICY "Users can view visits for their tenant" ON patient_visits
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert visits for their tenant" ON patient_visits
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update visits for their tenant" ON patient_visits
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- 7. Create RLS policies for patient_vitals
CREATE POLICY "Users can view vitals for their tenant" ON patient_vitals
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vitals for their tenant" ON patient_vitals
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vitals for their tenant" ON patient_vitals
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- 8. Grant permissions to authenticated users
GRANT ALL ON patient_visits TO authenticated;
GRANT ALL ON patient_vitals TO authenticated;

-- 9. Create function to automatically generate visit numbers
CREATE OR REPLACE FUNCTION generate_visit_number(p_tenant_id UUID, p_doctor_id UUID, p_patient_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    visit_count INTEGER;
    doctor_initials VARCHAR(10);
    patient_initials VARCHAR(10);
    visit_number VARCHAR(50);
BEGIN
    -- Get visit count for this patient
    SELECT COUNT(*) + 1 INTO visit_count
    FROM patient_visits 
    WHERE patient_id = p_patient_id;
    
    -- Get doctor initials (first letters of first and last name)
    SELECT UPPER(LEFT(full_name, 1) || LEFT(SPLIT_PART(full_name, ' ', -1), 1)) INTO doctor_initials
    FROM users 
    WHERE id = p_doctor_id;
    
    -- Get patient initials
    SELECT UPPER(LEFT(first_name, 1) || LEFT(last_name, 1)) INTO patient_initials
    FROM patients 
    WHERE id = p_patient_id;
    
    -- Generate visit number: DOC-PAT-YYYYMMDD-COUNT
    visit_number := COALESCE(doctor_initials, 'DR') || '-' || 
                   COALESCE(patient_initials, 'PT') || '-' || 
                   TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                   LPAD(visit_count::TEXT, 3, '0');
    
    RETURN visit_number;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to calculate BMI automatically
CREATE OR REPLACE FUNCTION calculate_bmi(height_cm DECIMAL, weight_kg DECIMAL)
RETURNS DECIMAL(4,2) AS $$
BEGIN
    IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 THEN
        RETURN NULL;
    END IF;
    
    -- BMI = weight(kg) / (height(m))^2
    RETURN ROUND((weight_kg / POWER(height_cm / 100, 2))::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to auto-calculate BMI
CREATE OR REPLACE FUNCTION auto_calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    NEW.bmi := calculate_bmi(NEW.height_cm, NEW.weight_kg);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_bmi
    BEFORE INSERT OR UPDATE ON patient_vitals
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_bmi();

-- 12. Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_patient_visits_updated_at
    BEFORE UPDATE ON patient_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
