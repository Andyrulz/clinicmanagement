const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testFormFlow() {
  console.log('🧪 Testing the form\'s authentication flow...\n');
  
  const supabase = createClient(supabaseUrl, anonKey);
  
  // Step 1: Check if we can get session without login
  console.log('1️⃣ Checking current session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.log('❌ Session error:', sessionError.message);
  } else if (!session) {
    console.log('⚠️ No active session - user needs to login');
  } else {
    console.log('✅ Active session found for user:', session.user.email);
    
    // Step 2: Try to query users table with authenticated session
    console.log('\n2️⃣ Testing users table query with auth...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('auth_user_id', session.user.id)
      .single();
    
    if (userError) {
      console.log('❌ User profile error:', userError.message);
    } else {
      console.log('✅ User profile:', userData);
      
      // Step 3: Test doctors query (what the form does)
      console.log('\n3️⃣ Testing doctors query (form simulation)...');
      const { data: doctorsList, error: doctorsError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name');
      
      if (doctorsError) {
        console.log('❌ Doctors query error:', doctorsError.message);
        console.log('This is why the form shows "Failed to create availability"');
      } else {
        console.log(`✅ Found ${doctorsList.length} doctors:`, doctorsList.map(d => d.full_name));
      }
    }
  }
  
  console.log('\n💡 Solution:');
  if (!session) {
    console.log('   - User needs to login first at /login');
    console.log('   - Then navigate to /dashboard/availability');
  } else {
    console.log('   - Check RLS policies on users table');
    console.log('   - Ensure authenticated users can read doctor profiles');
  }
}

testFormFlow();
