const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  try {
    console.log('🔍 Inspecting database schema...\n');
    
    // Check tenants table
    console.log('1️⃣ Checking tenants table...');
    const { data: tenantsData, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (tenantsError) {
      console.error('❌ Tenants table error:', tenantsError.message);
    } else {
      console.log('✅ Tenants table accessible');
      if (tenantsData.length > 0) {
        console.log('Sample tenant columns:', Object.keys(tenantsData[0]));
      }
    }
    
    // Check users table
    console.log('\n2️⃣ Checking users table...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      if (usersData.length > 0) {
        console.log('Sample user columns:', Object.keys(usersData[0]));
      } else {
        console.log('📊 Users table is empty');
      }
    }
    
    // Try to create a minimal tenant
    console.log('\n3️⃣ Attempting to create minimal tenant...');
    const { data: newTenant, error: newTenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Test Clinic'
      })
      .select()
      .single();
    
    if (newTenantError) {
      console.error('❌ Error creating minimal tenant:', newTenantError.message);
    } else {
      console.log('✅ Minimal tenant created:', newTenant);
      
      // Now create a doctor
      console.log('\n4️⃣ Creating sample doctor...');
      const { data: newDoctor, error: newDoctorError } = await supabase
        .from('users')
        .insert({
          tenant_id: newTenant.id,
          email: 'test.doctor@clinic.com',
          full_name: 'Dr. Test Doctor',
          role: 'doctor',
          is_active: true
        })
        .select()
        .single();
      
      if (newDoctorError) {
        console.error('❌ Error creating doctor:', newDoctorError.message);
      } else {
        console.log('✅ Doctor created:', newDoctor.full_name);
        console.log('\n🎉 Success! You now have a tenant and a doctor.');
        console.log('🔄 Try creating availability again - it should work now!');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

inspectSchema();
