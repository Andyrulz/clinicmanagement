'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function TestAuthComponents() {
  const [clientStatus, setClientStatus] = useState<string>('Testing...')
  const [authStatus, setAuthStatus] = useState<string>('Testing...')
  const [userInfo, setUserInfo] = useState<User | null>(null)
  const [setupStatus, setSetupStatus] = useState<string>('Checking...')

  useEffect(() => {
    async function testClients() {
      try {
        const supabase = createClient()
        
        // Test 1: Basic client connection
        const { error } = await supabase.from('tenants').select('count').limit(1)
        if (error) {
          setClientStatus(`❌ Client Error: ${error.message}`)
        } else {
          setClientStatus('✅ Browser client connected successfully')
        }
        
        // Test 2: Auth state
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
          setAuthStatus(`❌ Auth Error: ${authError.message}`)
          setSetupStatus('❌ Cannot check setup - not authenticated')
        } else if (user) {
          setAuthStatus('✅ User authenticated')
          setUserInfo(user)
          
          // Test 3: Check setup status
          const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('id, full_name, role, tenant:tenants(name)')
            .eq('auth_user_id', user.id)
            .single()
            
          if (userError || !userRecord) {
            setSetupStatus('⚪ Setup incomplete - user record not found')
          } else {
            const tenant = Array.isArray(userRecord.tenant) ? userRecord.tenant[0] : userRecord.tenant
            setSetupStatus(`✅ Setup complete - Role: ${userRecord.role}, Clinic: ${tenant?.name || 'Unknown'}`)
          }
        } else {
          setAuthStatus('⚪ No user authenticated')
          setSetupStatus('⚪ Not authenticated - cannot check setup')
        }
        
      } catch (error) {
        setClientStatus(`❌ Connection failed: ${error}`)
        setAuthStatus(`❌ Auth test failed: ${error}`)
        setSetupStatus(`❌ Setup check failed: ${error}`)
      }
    }
    
    testClients()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 border">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🔐 Step 2.3: Authentication Components Test
        </h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Browser Client Test:</h3>
            <p className="text-lg text-gray-700 font-medium">{clientStatus}</p>
          </div>
          
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Authentication Test:</h3>
            <p className="text-lg text-gray-700 font-medium">{authStatus}</p>
            {userInfo && (
              <div className="mt-2 p-3 bg-green-100 rounded border border-green-300">
                <p className="text-gray-800"><strong>User ID:</strong> {userInfo.id}</p>
                <p className="text-gray-800"><strong>Email:</strong> {userInfo.email}</p>
                <button
                  onClick={handleLogout}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Setup Status:</h3>
            <p className="text-lg text-gray-700 font-medium">{setupStatus}</p>
            {userInfo && setupStatus.includes('incomplete') && (
              <div className="mt-2">
                <Link 
                  href="/setup" 
                  className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-medium"
                >
                  🛠️ Complete Setup
                </Link>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Test Authentication Components:</h3>
            <div className="space-y-2">
              <div>
                <Link 
                  href="/signup" 
                  className="inline-block px-6 py-3 bg-green-700 text-white rounded hover:bg-green-800 mr-4 font-medium"
                >
                  🆕 Test Signup Form
                </Link>
                <Link 
                  href="/login" 
                  className="inline-block px-6 py-3 bg-blue-700 text-white rounded hover:bg-blue-800 font-medium"
                >
                  🔑 Test Login Form
                </Link>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-300">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">🚨 Testing Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click &quot;Test Signup Form&quot; to create a new account</li>
              <li>Check your email for verification link</li>
              <li>Click verification link (should redirect to setup)</li>
              <li>If you&apos;re already authenticated but setup is incomplete, click &quot;Complete Setup&quot;</li>
              <li>After setup, try &quot;Test Login Form&quot; to see the dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
