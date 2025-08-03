const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment check:');
console.log('URL exists:', !!supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAvailabilityInsert() {
  try {
    console.log('\n🔍 Testing doctor_availability table access...');
    
    // First, let's check if we can read from the table
    const { data: readTest, error: readError } = await supabase
      .from('doctor_availability')
      .select('*')
      .limit(1);
    
    if (readError) {
      console.error('❌ Read error:', readError.message);
      return;
    }
    
    console.log('✅ Can read from doctor_availability table');
    
    // Now let's try to get a test doctor ID
    const { data: doctors, error: doctorError } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('role', 'doctor')
      .limit(1);
    
    if (doctorError) {
      console.error('❌ Doctor query error:', doctorError.message);
      return;
    }
    
    if (!doctors || doctors.length === 0) {
      console.log('⚠️ No doctors found in the database');
      return;
    }
    
    const testDoctor = doctors[0];
    console.log('✅ Found test doctor:', testDoctor.full_name);
    
    // Now try a test insert
    const testData = {
      doctor_id: testDoctor.id,
      day_of_week: 1, // Monday
      start_time: '09:00',
      end_time: '12:00',
      slot_duration_minutes: 30,
      buffer_time_minutes: 0,
      max_patients_per_slot: 1,
      availability_type: 'regular',
      effective_from: new Date().toISOString().split('T')[0],
      notes: 'Test availability'
    };
    
    console.log('\n🧪 Testing availability insert with data:', JSON.stringify(testData, null, 2));
    
    const { data: insertResult, error: insertError } = await supabase
      .from('doctor_availability')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
      console.error('Error details:', insertError);
      return;
    }
    
    console.log('✅ Successfully inserted availability:', insertResult.id);
    
    // Clean up - delete the test record
    const { error: deleteError } = await supabase
      .from('doctor_availability')
      .delete()
      .eq('id', insertResult.id);
    
    if (deleteError) {
      console.log('⚠️ Could not clean up test record:', deleteError.message);
    } else {
      console.log('✅ Cleaned up test record');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAvailabilityInsert();
