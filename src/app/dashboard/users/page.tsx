'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import UserManagement from '@/components/admin/user-management'
import InviteUserForm from '@/components/admin/invite-user-form'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

export default function UsersPage() {
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    tenantId: string
    currentUserId: string
    currentUserRole: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        // Get user details from users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('tenant_id, role, id')
          .eq('auth_user_id', user.id)
          .single()

        if (userError) {
          throw new Error(`Failed to load user details: ${userError.message}`)
        }

        if (!userRecord) {
          throw new Error('User record not found')
        }

        // Check if user has admin permissions
        if (userRecord.role !== 'admin' && userRecord.role !== 'doctor') {
          setError('Access denied. You need admin or doctor privileges to access user management.')
          return
        }

        setUserInfo({
          tenantId: userRecord.tenant_id,
          currentUserId: userRecord.id,
          currentUserRole: userRecord.role
        })
      } catch (err) {
        console.error('Error loading user info:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user information')
      } finally {
        setLoading(false)
      }
    }

    loadUserInfo()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading user management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ArrowLeft className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-8">Unable to load user information</p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mr-3 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <span className="font-medium">Dashboard</span>
              </Link>
              <div className="h-8 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage clinic staff, doctors, and administrators
                </p>
              </div>
            </div>
            
            {/* Enhanced Invite User Button */}
            {userInfo && ['admin', 'manager'].includes(userInfo.currentUserRole) && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Invite User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Invite User Modal */}
        {showInviteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-100">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">Invite New User</h2>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <InviteUserForm
                  tenantId={userInfo.tenantId}
                  currentUserId={userInfo.currentUserId}
                  onSuccess={() => {
                    setShowInviteForm(false)
                    // Refresh the user management component
                    window.location.reload()
                  }}
                  onCancel={() => setShowInviteForm(false)}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* User Management Component */}
        <UserManagement
          tenantId={userInfo.tenantId}
          currentUserId={userInfo.currentUserId}
          currentUserRole={userInfo.currentUserRole}
        />
      </div>
    </div>
  )
}
