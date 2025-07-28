'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AuthCallbackHandler from '@/components/auth/auth-callback'
import Link from 'next/link'

function HomeContent() {
  const [count, setCount] = useState(0)
  const searchParams = useSearchParams()
  
  // Check if this is an auth callback
  const code = searchParams.get('code')
  
  if (code) {
    return <AuthCallbackHandler />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-800">
          🏥 Clinic Management System
        </h1>
        <p className="text-xl text-gray-700">
          Setup Complete! All dependencies installed.
        </p>
        
        <div className="bg-white p-6 rounded-lg shadow-xl border max-w-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Test Counter</h2>
          <p className="text-gray-700 mb-4">Counter: {count}</p>
          <button 
            onClick={() => setCount(count + 1)}
            className="bg-blue-700 text-white px-6 py-3 rounded hover:bg-blue-800 font-semibold"
          >
            Increment
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">🧪 Test Pages</h3>
            <div className="space-y-2">
              <Link 
                href="/test-supabase" 
                className="block bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 font-medium"
              >
                Test Supabase Connection
              </Link>
              <Link 
                href="/test-auth" 
                className="block bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 font-medium"
              >
                Test Authentication
              </Link>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-lg border">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">🔐 Authentication</h3>
            <div className="space-y-2">
              <Link 
                href="/signup" 
                className="block bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 font-medium"
              >
                🆕 Create Account
              </Link>
              <Link 
                href="/login" 
                className="block bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 font-medium"
              >
                🔑 Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
