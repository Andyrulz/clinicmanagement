# Database Architecture Documentation

## 📊 **Current Database Schema** (Supabase PostgreSQL)

### **Overview**

The Clinic Management System uses a multi-tenant PostgreSQL database with Row Level Security (RLS) for data isolation. Each table is designed to support multiple clinics (tenants) while ensuring secure data separation.

---

## 🏗️ **Core Tables Structure**

### **1. tenants (Multi-tenant Foundation)**

**Status:** ✅ Complete | **Purpose:** Clinic organization management

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

**Key Features:**

- Unique slug for tenant identification
- Soft delete support with is_active flag
- Audit timestamps for tracking

---

### **2. users (Authentication & Authorization)**

**Status:** ✅ Complete | **Purpose:** User management with role-based access

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE NOT NULL, -- Supabase auth.users.id
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**

- Links to Supabase authentication system
- Role-based access control (admin, doctor, receptionist)
- Tenant association for multi-tenancy
- Active status for user management

**Indexes:**

- `idx_users_tenant_id` - Fast tenant-based queries
- `idx_users_auth_user_id` - Authentication lookups
- `idx_users_email` - Email-based searches

---

### **3. invitations (User Onboarding)**

**Status:** ✅ Complete | **Purpose:** Staff invitation workflow

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist')),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**

- Secure token-based invitation system
- Expiration time management
- Usage tracking
- Invitation audit trail

---

### **4. patients (Patient Records)**

**Status:** ✅ Complete | **Purpose:** Comprehensive patient information

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  uhid VARCHAR(50) UNIQUE NOT NULL, -- Format: P-YYYYMMDD-HHMMSS-XXX
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  full_name VARCHAR(511) GENERATED ALWAYS AS (
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
  ) STORED,
  age INTEGER,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  phone VARCHAR(20),
  email VARCHAR(255),
  date_of_birth DATE,
  aadhaar_number VARCHAR(12),
  address JSONB, -- Structured address data
  emergency_contact JSONB, -- Emergency contact information
  medical_history TEXT,
  allergies TEXT,
  registration_fee NUMERIC(10,2) DEFAULT 0,
  registration_fee_paid BOOLEAN DEFAULT false,
  registration_payment_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);
```

**Key Features:**

- Auto-generated UHID (Unique Health ID)
- Computed full_name column for display
- JSONB storage for flexible address and contact data
- Phone uniqueness within tenant
- Registration fee tracking
- Medical history and allergy documentation

**Constraints:**

- `patients_tenant_phone_unique` - Unique phone per tenant
- `patients_gender_check` - Valid gender values
- `patients_status_check` - Valid status values

**Indexes:**

- `idx_patients_tenant_uhid` - Fast patient lookups
- `idx_patients_phone` - Phone-based searches
- `idx_patients_created_at` - Chronological queries

---

### **5. patient_visits (Visit & Consultation Management)**

**Status:** ✅ Complete | **Purpose:** Complete visit workflow management

```sql
CREATE TABLE patient_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visit_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: DOC-PAT-YYYYMMDD-COUNT
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_time TIME DEFAULT CURRENT_TIME,
  visit_type VARCHAR(20) DEFAULT 'new' CHECK (visit_type IN ('new', 'follow_up')),
  consultation_fee NUMERIC(10,2) DEFAULT 0,
  consultation_fee_paid BOOLEAN DEFAULT false,
  consultation_payment_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),

  -- Clinical Documentation
  chief_complaints TEXT,
  history_of_present_illness TEXT,
  past_medical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  physical_examination TEXT,
  clinical_findings TEXT,

  -- Diagnosis & Treatment
  diagnosis TEXT,
  differential_diagnosis TEXT,
  treatment_plan TEXT,
  prescription JSONB, -- Structured prescription data
  general_advice TEXT,
  follow_up_date DATE,
  follow_up_instructions TEXT,

  -- Orders & Tests
  tests_ordered JSONB, -- Lab test orders
  scan_orders JSONB, -- Imaging orders

  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);
```

**Key Features:**

- Auto-generated visit numbers with pattern: `DOC-PAT-YYYYMMDD-COUNT`
- Complete consultation workflow support
- JSONB storage for prescriptions and test orders
- Visit status progression tracking
- Comprehensive clinical documentation fields

**Indexes:**

- `idx_patient_visits_tenant_id` - Tenant-based queries
- `idx_patient_visits_patient_id` - Patient history
- `idx_patient_visits_doctor_id` - Doctor's appointments
- `idx_patient_visits_date` - Date-based scheduling
- `idx_patient_visits_status` - Status filtering

---

### **6. patient_vitals (Medical Measurements)**

**Status:** ✅ Complete | **Purpose:** Vital signs and measurements tracking

```sql
CREATE TABLE patient_vitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES patient_visits(id) ON DELETE CASCADE,

  -- Vital Measurements
  height_cm NUMERIC(5,2), -- Height in centimeters
  weight_kg NUMERIC(5,2), -- Weight in kilograms
  bmi NUMERIC(4,2), -- Auto-calculated BMI
  pulse_rate INTEGER, -- Beats per minute
  blood_pressure_systolic INTEGER, -- mmHg
  blood_pressure_diastolic INTEGER, -- mmHg
  spo2 INTEGER, -- Oxygen saturation %
  temperature_celsius NUMERIC(4,2), -- Body temperature
  respiratory_rate INTEGER, -- Breaths per minute
  blood_glucose NUMERIC(5,2), -- mg/dL
  notes TEXT,

  -- Audit Trail
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  recorded_by UUID REFERENCES users(id),

  -- Medical Range Constraints
  CONSTRAINT vitals_height_check CHECK (height_cm > 0 AND height_cm < 300),
  CONSTRAINT vitals_weight_check CHECK (weight_kg > 0 AND weight_kg < 500),
  CONSTRAINT vitals_bmi_check CHECK (bmi > 0 AND bmi < 100),
  CONSTRAINT vitals_pulse_check CHECK (pulse_rate > 0 AND pulse_rate < 300),
  CONSTRAINT vitals_bp_systolic_check CHECK (blood_pressure_systolic > 0 AND blood_pressure_systolic < 300),
  CONSTRAINT vitals_bp_diastolic_check CHECK (blood_pressure_diastolic > 0 AND blood_pressure_diastolic < 200),
  CONSTRAINT vitals_spo2_check CHECK (spo2 >= 0 AND spo2 <= 100),
  CONSTRAINT vitals_temp_check CHECK (temperature_celsius > 30 AND temperature_celsius < 45)
);
```

**Key Features:**

- Comprehensive vital signs tracking
- Auto-calculated BMI via database triggers
- Medical range validation constraints
- Visit-linked measurements
- Historical tracking capability

**Indexes:**

- `idx_patient_vitals_tenant_id` - Tenant-based queries
- `idx_patient_vitals_patient_id` - Patient vitals history
- `idx_patient_vitals_visit_id` - Visit-specific vitals
- `idx_patient_vitals_recorded_at` - Chronological tracking

---

## 🔧 **Database Functions & Triggers**

### **1. Visit Number Generation**

```sql
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
    FROM patient_visits WHERE patient_id = p_patient_id;

    -- Get doctor initials
    SELECT UPPER(LEFT(full_name, 1) || LEFT(SPLIT_PART(full_name, ' ', -1), 1))
    INTO doctor_initials FROM users WHERE id = p_doctor_id;

    -- Get patient initials
    SELECT UPPER(LEFT(first_name, 1) || LEFT(last_name, 1))
    INTO patient_initials FROM patients WHERE id = p_patient_id;

    -- Generate visit number: DOC-PAT-YYYYMMDD-COUNT
    visit_number := COALESCE(doctor_initials, 'DR') || '-' ||
                   COALESCE(patient_initials, 'PT') || '-' ||
                   TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' ||
                   LPAD(visit_count::TEXT, 3, '0');

    RETURN visit_number;
END;
$$ LANGUAGE plpgsql;
```

### **2. BMI Auto-Calculation**

```sql
CREATE OR REPLACE FUNCTION calculate_bmi(height_cm NUMERIC, weight_kg NUMERIC)
RETURNS NUMERIC(4,2) AS $$
BEGIN
    IF height_cm IS NULL OR weight_kg IS NULL OR height_cm <= 0 THEN
        RETURN NULL;
    END IF;

    -- BMI = weight(kg) / (height(m))^2
    RETURN ROUND((weight_kg / POWER(height_cm / 100, 2))::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-calculating BMI
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
```

### **3. Timestamp Updates**

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to tables with updated_at columns
CREATE TRIGGER trigger_update_patient_visits_updated_at
    BEFORE UPDATE ON patient_visits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔒 **Security & Row Level Security (RLS)**

### **Multi-Tenant Isolation**

All tables implement RLS policies to ensure tenant-based data isolation:

```sql
-- Example RLS Policy for patients table
CREATE POLICY "Users can view patients for their tenant" ON patients
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert patients for their tenant" ON patients
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()
    )
  );
```

### **Role-Based Access Control**

- **Admin:** Full access to tenant data, user management
- **Doctor:** Patient records, visits, prescriptions for their appointments
- **Receptionist:** Patient registration, visit scheduling, basic record access

### **Data Validation**

- Check constraints for valid enum values
- Range constraints for medical measurements
- Required field validation
- Email and phone format validation

---

## 📈 **Performance Optimization**

### **Indexing Strategy**

- **Primary Indexes:** All tables have UUID primary keys
- **Foreign Key Indexes:** Fast joins between related tables
- **Search Indexes:** Full-text search on patient names and phone numbers
- **Date Indexes:** Efficient date-range queries for appointments

### **Query Optimization**

- Computed columns for frequently accessed data (full_name)
- JSONB indexes for structured data queries
- Pagination support with LIMIT/OFFSET
- Efficient count queries with `count: 'exact'`

---

## 🔮 **Future Schema Extensions**

### **Planned Tables**

1. **appointments** - Advanced scheduling with calendar integration
2. **lab_orders** - Laboratory test ordering system
3. **lab_results** - Test results with file attachments
4. **billing** - Invoice generation and payment tracking
5. **prescriptions** - Dedicated prescription management (alternative to JSONB)
6. **medical_templates** - Clinical note templates
7. **audit_logs** - Comprehensive audit trail

### **Schema Evolution Strategy**

- **Migrations:** Version-controlled schema changes
- **Backward Compatibility:** Non-breaking changes preferred
- **Data Migration:** Safe data transformation procedures
- **Testing:** Schema changes tested in staging environment

---

This database architecture provides a solid foundation for the clinic management system with proper multi-tenancy, security, and scalability considerations.
