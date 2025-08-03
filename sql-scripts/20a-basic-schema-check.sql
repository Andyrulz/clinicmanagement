-- Basic Schema Check and Setup
-- Run this first to ensure basic tables exist

-- Check if essential tables exist
DO $$
BEGIN
    -- Check if tenants table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenants') THEN
        RAISE NOTICE 'Creating tenants table...';
        
        -- Create tenants table (basic structure)
        CREATE TABLE tenants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            domain VARCHAR(100) UNIQUE,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
        
        -- Basic policy for tenants
        CREATE POLICY "Tenant access" ON tenants
            FOR ALL TO authenticated
            USING (true)
            WITH CHECK (true);
            
        RAISE NOTICE 'Created tenants table';
    ELSE
        RAISE NOTICE 'tenants table already exists';
    END IF;

    -- Check if users table exists  
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Creating users table...';
        
        -- Create users table (basic structure)
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auth_user_id UUID UNIQUE,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            email VARCHAR(255) NOT NULL,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            role VARCHAR(20) DEFAULT 'doctor' CHECK (role IN ('admin', 'doctor', 'receptionist', 'manager')),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        -- Basic policy for users
        CREATE POLICY "User access" ON users
            FOR ALL TO authenticated
            USING (auth_user_id = auth.uid())
            WITH CHECK (auth_user_id = auth.uid());
            
        RAISE NOTICE 'Created users table';
    ELSE
        RAISE NOTICE 'users table already exists';
    END IF;

    -- Check if patients table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') THEN
        RAISE NOTICE 'Creating patients table...';
        
        -- Create patients table (basic structure)
        CREATE TABLE patients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            uhid VARCHAR(50),
            age INTEGER,
            gender VARCHAR(10),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
        
        -- Basic policy for patients
        CREATE POLICY "Patient access" ON patients
            FOR ALL TO authenticated
            USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()))
            WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()));
            
        RAISE NOTICE 'Created patients table';
    ELSE
        RAISE NOTICE 'patients table already exists';
    END IF;

    -- Check if patient_visits table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_visits') THEN
        RAISE NOTICE 'Creating patient_visits table...';
        
        -- Create patient_visits table (basic structure)
        CREATE TABLE patient_visits (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
            doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
            visit_number VARCHAR(50) UNIQUE NOT NULL,
            visit_date DATE DEFAULT CURRENT_DATE,
            visit_time TIME DEFAULT CURRENT_TIME,
            status VARCHAR(30) DEFAULT 'scheduled',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
        
        -- Basic policy for patient_visits
        CREATE POLICY "Visit access" ON patient_visits
            FOR ALL TO authenticated
            USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()))
            WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE auth_user_id = auth.uid()));
            
        RAISE NOTICE 'Created patient_visits table';
    ELSE
        RAISE NOTICE 'patient_visits table already exists';
    END IF;

END $$;

-- Show what tables now exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tenants', 'users', 'patients', 'patient_visits')
ORDER BY table_name;
