const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in the database...');
    
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching users:', error.message);
      return;
    }
    
    console.log(`\n📊 Found ${allUsers.length} users:`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name || 'No name'} (${user.email}) - Role: ${user.role} - Active: ${user.is_active}`);
    });
    
    const doctors = allUsers.filter(user => user.role === 'doctor');
    const admins = allUsers.filter(user => user.role === 'admin');
    const staff = allUsers.filter(user => user.role === 'staff');
    
    console.log(`\n📈 Summary:`);
    console.log(`- Doctors: ${doctors.length}`);
    console.log(`- Admins: ${admins.length}`);
    console.log(`- Staff: ${staff.length}`);
    console.log(`- Other roles: ${allUsers.length - doctors.length - admins.length - staff.length}`);
    
    if (doctors.length === 0) {
      console.log('\n⚠️ ISSUE FOUND: No doctors in the database!');
      console.log('The availability form requires at least one doctor user to work.');
      console.log('You need to either:');
      console.log('1. Create a doctor user, or');
      console.log('2. Change an existing user\'s role to "doctor"');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkUsers();
