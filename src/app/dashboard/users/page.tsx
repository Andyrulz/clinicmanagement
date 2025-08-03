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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user management...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Access Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link 
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load user information</p>
          <Link 
            href="/dashboard"
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">Manage clinic staff, doctors, and administrators</p>
              </div>
            </div>
            
            {/* Invite User Button */}
            {userInfo && ['admin', 'manager'].includes(userInfo.currentUserRole) && (
              <button
                onClick={() => setShowInviteForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Invite User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Invite User Modal */}
        {showInviteForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Invite New User</h2>
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
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
