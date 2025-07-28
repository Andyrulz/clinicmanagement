// Detailed database schema verification with actual column inspection
const { createClient } = require('@supabase/supabase-js');
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

async function detailedSchemaCheck() {
  console.log('🔍 Detailed Schema Verification...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get table information using information_schema
    console.log('📋 Inspecting table schemas...\n');

    // Check if we have sample data first
    console.log('1. CHECKING SAMPLE DATA:');
    const { data: patientCount } = await supabase
      .from('patients')
      .select('id', { count: 'exact', head: true });
      
    const { data: visitCount } = await supabase
      .from('patient_visits')
      .select('id', { count: 'exact', head: true });
      
    const { data: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    console.log(`   Patients: ${patientCount?.length || 0}`);
    console.log(`   Visits: ${visitCount?.length || 0}`);
    console.log(`   Users: ${userCount?.length || 0}`);

    // Check patient_visits columns specifically
    console.log('\n2. PATIENT_VISITS TABLE STRUCTURE:');
    const { data: sampleVisit } = await supabase
      .from('patient_visits')
      .select('*')
      .limit(1)
      .single();

    if (sampleVisit) {
      const columns = Object.keys(sampleVisit);
      console.log('   All columns:', columns);
      console.log('   ✅ follow_up_date:', columns.includes('follow_up_date'));
      console.log('   ✅ follow_up_instructions:', columns.includes('follow_up_instructions'));
      console.log('   ✅ history_of_present_illness:', columns.includes('history_of_present_illness'));
      console.log('   ✅ physical_examination:', columns.includes('physical_examination'));
      console.log('   ✅ diagnosis:', columns.includes('diagnosis'));
      console.log('   ✅ treatment_plan:', columns.includes('treatment_plan'));
      console.log('   ✅ general_advice:', columns.includes('general_advice'));
    } else {
      console.log('   No sample visit data found');
    }

    // Check consultations table structure
    console.log('\n3. CONSULTATIONS TABLE STRUCTURE:');
    const { data: sampleConsultation } = await supabase
      .from('consultations')
      .select('*')
      .limit(1)
      .single();

    if (sampleConsultation) {
      const columns = Object.keys(sampleConsultation);
      console.log('   All columns:', columns);
      console.log('   ✅ visit_id:', columns.includes('visit_id'));
      console.log('   ✅ appointment_id:', columns.includes('appointment_id'));
      console.log('   ✅ patient_id:', columns.includes('patient_id'));
      console.log('   ✅ doctor_id:', columns.includes('doctor_id'));
    } else {
      console.log('   No sample consultation data found');
    }

    // Check prescriptions table structure
    console.log('\n4. PRESCRIPTIONS TABLE STRUCTURE:');
    const { data: samplePrescription } = await supabase
      .from('prescriptions')
      .select('*')
      .limit(1)
      .single();

    if (samplePrescription) {
      const columns = Object.keys(samplePrescription);
      console.log('   All columns:', columns);
      console.log('   ✅ consultation_id:', columns.includes('consultation_id'));
      console.log('   ✅ medications (JSONB):', columns.includes('medications'));
      console.log('   ✅ patient_id:', columns.includes('patient_id'));
      console.log('   ✅ doctor_id:', columns.includes('doctor_id'));
      console.log('   ✅ visit_id:', columns.includes('visit_id'));
    } else {
      console.log('   No sample prescription data found');
    }

    // Check all users (not just doctors)
    console.log('\n5. USERS TABLE DATA:');
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, full_name, role, is_active')
      .limit(5);

    if (allUsers && allUsers.length > 0) {
      console.log('   Sample users:');
      allUsers.forEach(user => {
        console.log(`   - ${user.full_name} (${user.role}) - Active: ${user.is_active}`);
      });
    } else {
      console.log('   No users found in the system');
    }

    console.log('\n🎯 DETAILED VERIFICATION COMPLETE');
    console.log('===================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

detailedSchemaCheck();
