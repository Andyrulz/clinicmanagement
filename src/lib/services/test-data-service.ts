// Test data service for development/testing
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function createSampleData() {
  try {
    // Get current user's tenant ID
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('User not authenticated')

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) throw new Error('User data not found')

    const tenantId = userData.tenant_id

    // Create sample patients
    const { error: patientsError } = await supabase
      .from('patients')
      .insert([
        {
          tenant_id: tenantId,
          first_name: 'John',
          last_name: 'Doe',
          phone: '1234567890',
          uhid: 'UHID001',
          age: 35,
          gender: 'male',
          registration_fee: 500,
          registration_fee_paid: true,
          status: 'active'
        },
        {
          tenant_id: tenantId,
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '2345678901',
          uhid: 'UHID002',
          age: 28,
          gender: 'female',
          registration_fee: 500,
          registration_fee_paid: true,
          status: 'active'
        },
        {
          tenant_id: tenantId,
          first_name: 'Robert',
          last_name: 'Johnson',
          phone: '3456789012',
          uhid: 'UHID003',
          age: 45,
          gender: 'male',
          registration_fee: 500,
          registration_fee_paid: true,
          status: 'active'
        }
      ])

    if (patientsError) {
      console.log('Patients might already exist or other error:', patientsError)
    } else {
      console.log('Sample patients created successfully')
    }

    // Create sample doctors (users with doctor role)
    const { error: doctorsError } = await supabase
      .from('users')
      .insert([
        {
          tenant_id: tenantId,
          full_name: 'Dr. Sarah Wilson',
          email: 'dr.sarah@clinic.com',
          role: 'doctor',
          is_active: true
        },
        {
          tenant_id: tenantId,
          full_name: 'Dr. Michael Chen',
          email: 'dr.michael@clinic.com',
          role: 'doctor',
          is_active: true
        },
        {
          tenant_id: tenantId,
          full_name: 'Dr. Emily Davis',
          email: 'dr.emily@clinic.com',
          role: 'doctor',
          is_active: true
        }
      ])

    if (doctorsError) {
      console.log('Doctors might already exist or other error:', doctorsError)
    } else {
      console.log('Sample doctors created successfully')
    }

    return { success: true, message: 'Sample data created successfully' }

  } catch (error) {
    console.error('Error creating sample data:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}
