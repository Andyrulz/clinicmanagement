'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing')
  const [error, setError] = useState<string | null>(null)
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        
        // Test the connection by trying to get the current session
        const { error } = await supabase.auth.getSession()
        
        if (error) {
          setConnectionStatus('error')
          setError(error.message)
        } else {
          // If we get here without errors, connection is working
          setConnectionStatus('connected')
          setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set')
        }
      } catch (err) {
        // Check if it's a connection/configuration error
        if (err instanceof Error) {
          if (err.message.includes('relation') && err.message.includes('does not exist')) {
            // This actually means we're connected! The database just doesn't have tables yet.
            setConnectionStatus('connected')
            setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set')
          } else {
            setConnectionStatus('error')
            setError(err.message)
          }
        } else {
          setConnectionStatus('error')
          setError('Unknown error occurred')
        }
      }
    }

    testConnection()
  }, [])

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'testing': return 'text-yellow-600'
      case 'connected': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing': return '⏳'
      case 'connected': return '✅'
      case 'error': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 max-w-md w-full p-6">
        <h1 className="text-4xl font-bold text-gray-900">
          🏥 Supabase Connection Test
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Connection Status</h2>
          
          <div className={`text-lg mb-4 ${getStatusColor()}`}>
            {getStatusIcon()} {connectionStatus.toUpperCase()}
          </div>
          
          {supabaseUrl && (
            <div className="text-sm text-gray-600 mb-4">
              <strong>URL:</strong> {supabaseUrl}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {connectionStatus === 'connected' ? (
            <>
              ✅ Supabase connected successfully!<br/>
              ✅ Environment variables configured<br/>
              ✅ Ready for database setup
            </>
          ) : connectionStatus === 'error' ? (
            <>
              ❌ Please check your environment variables<br/>
              ❌ Ensure .env.local has correct values<br/>
              ❌ Restart the dev server after updating .env.local
            </>
          ) : (
            <>
              ⏳ Testing Supabase connection...<br/>
              ⏳ Please wait...
            </>
          )}
        </div>
        
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
