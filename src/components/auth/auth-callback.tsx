'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallbackHandler() {
  const [status, setStatus] = useState('Processing verification...')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code')
        
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            setStatus(`❌ Verification failed: ${error.message}`)
          } else if (data.user) {
            setStatus('✅ Email verified successfully! Checking setup status...')
            
            // Check if user already has setup completed
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', data.user.id)
              .single()
              
            if (existingUser) {
              setStatus('✅ Setup already complete! Redirecting to dashboard...')
              setTimeout(() => {
                router.push('/dashboard')
              }, 2000)
            } else {
              setStatus('✅ Email verified! Redirecting to complete setup...')
              setTimeout(() => {
                router.push('/setup')
              }, 2000)
            }
          }
        } else {
          setStatus('❌ No verification code found')
        }
      } catch (error) {
        setStatus(`❌ Verification error: ${error}`)
      }
    }

    handleAuthCallback()
  }, [searchParams, router, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-xl border text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🔐 Email Verification
        </h1>
        <p className="text-lg text-gray-700 font-medium">{status}</p>
        
        {status.includes('failed') && (
          <div className="mt-4">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-blue-700 text-white rounded hover:bg-blue-800 font-semibold"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
