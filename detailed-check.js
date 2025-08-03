const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Try both anon and service role keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking database with different access levels...\n');

async function checkWithAnonKey() {
  console.log('1️⃣ Testing with ANON key (RLS enforced)...');
  const supabase = createClient(supabaseUrl, anonKey);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, tenant_id')
    .eq('role', 'doctor');
  
  if (error) {
    console.log('❌ Anon key error:', error.message);
  } else {
    console.log(`✅ Found ${data.length} doctors with anon key`);
    data.forEach(doctor => console.log(`   - ${doctor.full_name} (${doctor.email})`));
  }
}

async function checkWithServiceKey() {
  if (!serviceKey) {
    console.log('2️⃣ ⚠️ No service role key found, skipping...');
    return;
  }
  
  console.log('2️⃣ Testing with SERVICE ROLE key (bypass RLS)...');
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, tenant_id')
    .eq('role', 'doctor');
  
  if (error) {
    console.log('❌ Service key error:', error.message);
  } else {
    console.log(`✅ Found ${data.length} doctors with service key`);
    data.forEach(doctor => console.log(`   - ${doctor.full_name} (${doctor.email}) - Tenant: ${doctor.tenant_id}`));
  }
}

async function checkAllUsers() {
  if (!serviceKey) {
    console.log('3️⃣ ⚠️ No service role key, cannot check all users');
    return;
  }
  
  console.log('3️⃣ Checking ALL users with service key...');
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, tenant_id, auth_user_id, is_active');
  
  if (error) {
    console.log('❌ Error getting all users:', error.message);
  } else {
    console.log(`✅ Found ${data.length} total users`);
    if (data.length > 0) {
      console.log('\n📊 All users:');
      data.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || 'No name'} (${user.email || 'No email'}) - Role: ${user.role} - Active: ${user.is_active} - Tenant: ${user.tenant_id}`);
      });
    }
  }
}

async function main() {
  try {
    await checkWithAnonKey();
    console.log('');
    await checkWithServiceKey();
    console.log('');
    await checkAllUsers();
    
    console.log('\n🔧 If doctors exist but anon key shows 0:');
    console.log('   - RLS policies might be blocking access');
    console.log('   - User might not be authenticated');
    console.log('   - User might be in wrong tenant');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

main();
