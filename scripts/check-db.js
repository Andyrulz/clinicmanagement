// Simple database schema verification
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function verifySchema() {
  console.log('🔍 Connecting to Supabase to verify database schema...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📋 Checking core tables...');

    // Check patients table
    console.log('\n1. PATIENTS TABLE:');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .limit(1);

    if (patientsError) {
      console.error('❌ Patients table error:', patientsError.message);
    } else {
      console.log('✅ Patients table accessible');
      if (patients && patients.length > 0) {
        console.log('   Sample columns:', Object.keys(patients[0]));
      }
    }

    // Check patient_visits table
    console.log('\n2. PATIENT_VISITS TABLE:');
    const { data: visits, error: visitsError } = await supabase
      .from('patient_visits')
      .select('*')
      .limit(1);

    if (visitsError) {
      console.error('❌ Patient_visits table error:', visitsError.message);
    } else {
      console.log('✅ Patient_visits table accessible');
      if (visits && visits.length > 0) {
        console.log('   Sample columns:', Object.keys(visits[0]));
        console.log('   Has follow_up_date:', 'follow_up_date' in visits[0]);
        console.log('   Has follow_up_instructions:', 'follow_up_instructions' in visits[0]);
      }
    }

    // Check consultations table
    console.log('\n3. CONSULTATIONS TABLE:');
    const { data: consultations, error: consultationsError } = await supabase
      .from('consultations')
      .select('*')
      .limit(1);

    if (consultationsError) {
      console.error('❌ Consultations table error:', consultationsError.message);
    } else {
      console.log('✅ Consultations table accessible');
      if (consultations && consultations.length > 0) {
        console.log('   Sample columns:', Object.keys(consultations[0]));
        console.log('   Has visit_id:', 'visit_id' in consultations[0]);
        console.log('   Has appointment_id:', 'appointment_id' in consultations[0]);
      }
    }

    // Check prescriptions table
    console.log('\n4. PRESCRIPTIONS TABLE:');
    const { data: prescriptions, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('*')
      .limit(1);

    if (prescriptionsError) {
      console.error('❌ Prescriptions table error:', prescriptionsError.message);
    } else {
      console.log('✅ Prescriptions table accessible');
      if (prescriptions && prescriptions.length > 0) {
        console.log('   Sample columns:', Object.keys(prescriptions[0]));
        console.log('   Has consultation_id:', 'consultation_id' in prescriptions[0]);
        console.log('   Has medications (JSONB):', 'medications' in prescriptions[0]);
        console.log('   Has visit_id:', 'visit_id' in prescriptions[0]);
      }
    }

    // Check users table (for doctors)
    console.log('\n5. USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('role', 'doctor')
      .limit(1);

    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      console.log(`   Found ${users ? users.length : 0} doctor(s)`);
    }

    // Test prescription_details view
    console.log('\n6. PRESCRIPTION_DETAILS VIEW:');
    const { error: viewError } = await supabase
      .from('prescription_details')
      .select('*')
      .limit(1);

    if (viewError) {
      console.error('❌ Prescription_details view error:', viewError.message);
      console.log('   This is expected if the SQL script hasn\'t been run yet');
    } else {
      console.log('✅ Prescription_details view accessible');
    }

    console.log('\n🎯 SCHEMA VERIFICATION COMPLETE');
    console.log('===================================');

  } catch (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  }
}

verifySchema();
