'use client'

import { createClient } from '@/lib/supabase/client'

export default function TestSupabase() {
  const handleTestConnection = async () => {
    try {
      console.log('🔍 Testing Supabase connection...')
      const supabase = createClient()
      
      // Test 1: Check auth status
      console.log('1️⃣ Testing authentication...')
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.error('❌ Auth error:', authError.message)
        alert('Auth error: ' + authError.message)
        return
      }
      
      if (!session) {
        console.log('⚠️ No active session')
        alert('No active session - please login first at /login')
        return
      }
      
      console.log('✅ User authenticated:', session.user.email)
      
      // Test 2: Check user profile
      console.log('2️⃣ Testing user profile access...')
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, full_name, role, tenant_id')
        .eq('auth_user_id', session.user.id)
        .single()
      
      if (profileError) {
        console.error('❌ Profile error:', profileError.message)
        alert('Profile error: ' + profileError.message)
        return
      }
      
      console.log('✅ User profile:', profile)
      
      // Test 3: Check doctors access
      console.log('3️⃣ Testing doctors access...')
      const { data: doctors, error: doctorsError } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('role', 'doctor')
        .eq('is_active', true)
      
      if (doctorsError) {
        console.error('❌ Doctors error:', doctorsError.message)
        alert('Doctors access error: ' + doctorsError.message)
        return
      }
      
      console.log('✅ Doctors accessible:', doctors.length, 'doctors found')
      console.log('Doctors:', doctors.map(d => d.full_name))
      
      // Test 4: Test availability table access
      console.log('4️⃣ Testing availability table access...')
      const { data: availability, error: availabilityError } = await supabase
        .from('doctor_availability')
        .select('*')
        .limit(1)
      
      if (availabilityError) {
        console.error('❌ Availability table error:', availabilityError.message)
        alert('Availability table error: ' + availabilityError.message)
        return
      }
      
      console.log('✅ Availability table accessible', availability?.length ? `Found ${availability.length} record(s)` : 'No records found')
      
      // Test 5: Try a simple insert test (then delete it)
      console.log('5️⃣ Testing availability insert...')
      
      if (doctors.length === 0) {
        alert('❌ No doctors found! You need doctors in the database first.')
        return
      }
      
      const testData = {
        doctor_id: doctors[0].id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:00',
        slot_duration_minutes: 30,
        buffer_time_minutes: 0,
        max_patients_per_slot: 1,
        availability_type: 'regular',
        effective_from: new Date().toISOString().split('T')[0],
        notes: 'Test availability - will be deleted'
      }
      
      console.log('Attempting to insert:', testData)
      
      const { data: insertResult, error: insertError } = await supabase
        .from('doctor_availability')
        .insert(testData)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Insert error:', insertError)
        alert('Insert error: ' + insertError.message + (insertError.details ? '\nDetails: ' + insertError.details : ''))
        return
      }
      
      console.log('✅ Insert successful:', insertResult.id)
      
      // Clean up the test record
      const { error: deleteError } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', insertResult.id)
      
      if (deleteError) {
        console.log('⚠️ Could not clean up test record:', deleteError.message)
      } else {
        console.log('✅ Test record cleaned up')
      }
      
      alert('✅ All tests passed! Database connection is working correctly.')
      
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      alert('Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-xl border">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          🔧 Supabase Connection Test
        </h1>
        
        <div className="space-y-4">
          <p className="text-gray-600 text-center">
            This will test your database connection and permissions.
            Check the browser console for detailed logs.
          </p>
          
          <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800 text-sm">
              <strong>Before running:</strong> Make sure you&apos;re logged in first!
            </p>
          </div>
          
          <button
            onClick={handleTestConnection}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-semibold"
          >
            🚀 Run Connection Test
          </button>
          
          <div className="text-center space-y-2">
            <div>
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                🔑 Login First
              </a>
            </div>
            <div>
              <a href="/dashboard/availability" className="text-blue-600 hover:text-blue-700 font-medium">
                ← Back to Availability
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
