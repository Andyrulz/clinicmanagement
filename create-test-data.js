const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  try {
    console.log('🏥 Creating sample tenant and users for testing...\n');
    
    // Create a sample tenant first
    console.log('1️⃣ Creating sample tenant...');
    const tenantId = 'ff8b835e-e3ef-493c-868e-5cc5b557cf53'; // Using the ID from the sample script
    
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .upsert({
        id: tenantId,
        name: 'Test Clinic',
        domain: 'test-clinic.com',
        status: 'active'
      })
      .select()
      .single();
    
    if (tenantError) {
      console.error('❌ Error creating tenant:', tenantError.message);
      return;
    }
    console.log('✅ Tenant created/updated:', tenantData.name);
    
    // Create sample admin user
    console.log('\n2️⃣ Creating sample admin user...');
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .upsert({
        tenant_id: tenantId,
        email: 'admin@testclinic.com',
        full_name: 'Test Admin',
        role: 'admin',
        phone: '+919999999999',
        is_active: true,
        auth_user_id: null // Will be null since this is just test data
      })
      .select()
      .single();
    
    if (adminError) {
      console.error('❌ Error creating admin:', adminError.message);
      return;
    }
    console.log('✅ Admin user created:', adminData.full_name);
    
    // Create sample doctors
    console.log('\n3️⃣ Creating sample doctors...');
    const doctors = [
      {
        tenant_id: tenantId,
        email: 'sarah.johnson@testclinic.com',
        full_name: 'Dr. Sarah Johnson',
        role: 'doctor',
        phone: '+919876543210',
        is_active: true,
        auth_user_id: null
      },
      {
        tenant_id: tenantId,
        email: 'michael.chen@testclinic.com',
        full_name: 'Dr. Michael Chen',
        role: 'doctor',
        phone: '+919876543211',
        is_active: true,
        auth_user_id: null
      },
      {
        tenant_id: tenantId,
        email: 'priya.sharma@testclinic.com',
        full_name: 'Dr. Priya Sharma',
        role: 'doctor',
        phone: '+919876543212',
        is_active: true,
        auth_user_id: null
      }
    ];
    
    for (const doctor of doctors) {
      const { data: doctorData, error: doctorError } = await supabase
        .from('users')
        .upsert(doctor)
        .select()
        .single();
      
      if (doctorError) {
        console.error(`❌ Error creating doctor ${doctor.full_name}:`, doctorError.message);
      } else {
        console.log(`✅ Doctor created: ${doctorData.full_name}`);
      }
    }
    
    // Verify the data
    console.log('\n4️⃣ Verifying created data...');
    const { data: allUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active')
      .eq('tenant_id', tenantId);
    
    if (verifyError) {
      console.error('❌ Error verifying data:', verifyError.message);
      return;
    }
    
    console.log(`\n📊 Successfully created ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log('\n🎉 Test data created successfully!');
    console.log('\n🔄 Next steps:');
    console.log('1. Go to /signup and create your account');
    console.log('2. Once logged in, you should see the doctors in the availability form');
    console.log('3. You can now create availability schedules for the doctors');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

createTestData();
