'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Activity,
  BarChart3,
  FileText,
  AlertTriangle,
  ArrowRight,
  Plus,
  Settings,
  UserPlus,
  Building
} from 'lucide-react'
import { analyticsService, type AnalyticsData } from '@/lib/services/analytics-service'

interface QuickStatProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  color: string
  href?: string
}

function QuickStat({ title, value, change, icon, color, href }: QuickStatProps) {
  const content = (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
      {href && (
        <div className="flex items-center justify-end mt-3 text-blue-600 hover:text-blue-800">
          <span className="text-sm font-medium mr-1">View Details</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : content
}

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

function QuickAction({ title, description, icon, href, color }: QuickActionProps) {
  return (
    <Link href={href} className="block">
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${color} mr-3`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get current user and their role
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        // Get user role from database
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', user.id)
          .single()

        if (userError || !userRecord) {
          throw new Error('Failed to load user information')
        }

        setUserRole(userRecord.role)
        
        // Load analytics data
        const data = await analyticsService.getAnalyticsData('1m')
        setAnalyticsData(data)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router, supabase])

  // Role-based access control helpers
  const canAccessUserManagement = () => {
    return userRole && ['admin', 'manager'].includes(userRole)
  }

  const canAccessTenantSettings = () => {
    return userRole === 'admin'
  }

  const canAccessAnalytics = () => {
    return userRole && ['admin', 'manager', 'doctor'].includes(userRole)
  }

  const canAccessPatientRisk = () => {
    return userRole && ['admin', 'manager', 'doctor'].includes(userRole)
  }

  const canManagePatients = () => {
    return userRole && ['admin', 'manager', 'doctor', 'receptionist'].includes(userRole)
  }

  const canManageVisits = () => {
    return userRole && ['admin', 'manager', 'doctor', 'receptionist'].includes(userRole)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome to your clinic management system</p>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <QuickStat
            title="Total Patients"
            value={analyticsData?.totalPatients || 0}
            change={`+${analyticsData?.newPatientsThisMonth || 0} this month`}
            icon={<Users className="w-6 h-6 text-white" />}
            color="bg-blue-500"
            href="/dashboard/patients"
          />
          <QuickStat
            title="Monthly Visits"
            value={analyticsData?.visitsThisMonth || 0}
            change={`${analyticsData?.visitsToday || 0} today`}
            icon={<Calendar className="w-6 h-6 text-white" />}
            color="bg-green-500"
            href="/dashboard/visits"
          />
          <QuickStat
            title="Monthly Revenue"
            value={`₹${(analyticsData?.revenueThisMonth || 0).toLocaleString()}`}
            change={`${analyticsData?.collectionRate || 0}% collection rate`}
            icon={<DollarSign className="w-6 h-6 text-white" />}
            color="bg-emerald-500"
            href="/dashboard/analytics"
          />
          <QuickStat
            title="Active Patients"
            value={analyticsData?.activePatients || 0}
            icon={<Activity className="w-6 h-6 text-white" />}
            color="bg-purple-500"
            href="/dashboard/patient-risk"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canManagePatients() && (
              <QuickAction
                title="Register New Patient"
                description="Add a new patient to system"
                icon={<Users className="w-5 h-5 text-white" />}
                href="/dashboard/patients"
                color="bg-blue-500"
              />
            )}
            {canManageVisits() && (
              <QuickAction
                title="Manage Visits"
                description="Schedule & manage patient visits"
                icon={<Plus className="w-5 h-5 text-white" />}
                href="/dashboard/visits"
                color="bg-green-500"
              />
            )}
            {canAccessUserManagement() && (
              <QuickAction
                title="User Management"
                description="Manage doctors, staff & admins"
                icon={<UserPlus className="w-5 h-5 text-white" />}
                href="/dashboard/users"
                color="bg-indigo-500"
              />
            )}
          </div>
          
          {/* Second Row of Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {canAccessTenantSettings() && (
              <QuickAction
                title="Clinic Settings"
                description="Configure clinic & tenant settings"
                icon={<Building className="w-5 h-5 text-white" />}
                href="/dashboard/tenant"
                color="bg-purple-500"
              />
            )}
            {canAccessAnalytics() && (
              <QuickAction
                title="View Analytics"
                description="Detailed clinic analytics"
                icon={<BarChart3 className="w-5 h-5 text-white" />}
                href="/dashboard/analytics"
                color="bg-emerald-500"
              />
            )}
            {canAccessPatientRisk() && (
              <QuickAction
                title="Patient Risk Analysis"
                description="Monitor at-risk patients"
                icon={<AlertTriangle className="w-5 h-5 text-white" />}
                href="/dashboard/patient-risk"
                color="bg-orange-500"
              />
            )}
          </div>
        </div>

        {/* Recent Activity & Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Administrative Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Administration</h3>
              {canAccessUserManagement() && (
                <Link href="/dashboard/users" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Manage Users
                </Link>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 flex items-center">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Active Users
                </span>
                <span className="font-medium">{analyticsData?.totalUsers || 5}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Doctors
                </span>
                <span className="font-medium text-blue-600">{analyticsData?.totalDoctors || 3}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 flex items-center">
                  <Building className="w-4 h-4 mr-2" />
                  Clinic Status
                </span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Your Role
                </span>
                <span className={`font-medium px-2 py-1 rounded text-xs ${
                  userRole === 'admin' ? 'bg-red-100 text-red-800' :
                  userRole === 'manager' ? 'bg-blue-100 text-blue-800' :
                  userRole === 'doctor' ? 'bg-green-100 text-green-800' :
                  userRole === 'receptionist' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {userRole?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
            
            {canAccessTenantSettings() && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  href="/dashboard/tenant" 
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Clinic Settings
                </Link>
              </div>
            )}
          </div>

          {/* Visit Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Visit Overview</h3>
              <Link href="/dashboard/visits" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Scheduled</span>
                <span className="font-medium">{analyticsData?.visitsByStatus?.scheduled || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium text-green-600">{analyticsData?.visitsByStatus?.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Cancelled</span>
                <span className="font-medium text-red-600">{analyticsData?.visitsByStatus?.cancelled || 0}</span>
              </div>
            </div>
          </div>

          {/* Top Diagnoses */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Common Diagnoses</h3>
              <Link href="/dashboard/analytics" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View Reports
              </Link>
            </div>
            
            <div className="space-y-3">
              {analyticsData?.commonDiagnoses?.slice(0, 5).map((diagnosis, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-gray-700 text-sm">{diagnosis.diagnosis}</span>
                  <span className="font-medium text-gray-900">{diagnosis.count}</span>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No diagnosis data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canManagePatients() && (
              <Link href="/dashboard/patients" className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <p className="font-medium text-gray-900">Patients</p>
                <p className="text-sm text-gray-600 mt-1">Manage patient records</p>
              </Link>
            )}
            {canAccessAnalytics() && (
              <Link href="/dashboard/analytics" className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-center">
                <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <p className="font-medium text-gray-900">Analytics</p>
                <p className="text-sm text-gray-600 mt-1">View detailed reports</p>
              </Link>
            )}
            {canManageVisits() && (
              <Link href="/dashboard/visits" className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-center">
                <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <p className="font-medium text-gray-900">Visits</p>
                <p className="text-sm text-gray-600 mt-1">Schedule & manage visits</p>
              </Link>
            )}
          </div>
          
          {/* Second Row of Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Reports - accessible to all roles */}
            <Link href="/dashboard/reports" className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-center">
              <FileText className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <p className="font-medium text-gray-900">Reports</p>
              <p className="text-sm text-gray-600 mt-1">Generate clinical reports</p>
            </Link>
            {canAccessUserManagement() && (
              <Link href="/dashboard/users" className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-center">
                <UserPlus className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                <p className="font-medium text-gray-900">User Management</p>
                <p className="text-sm text-gray-600 mt-1">Manage staff & permissions</p>
              </Link>
            )}
            {canAccessTenantSettings() && (
              <Link href="/dashboard/tenant" className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-center">
                <Settings className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="font-medium text-gray-900">Clinic Settings</p>
                <p className="text-sm text-gray-600 mt-1">Configure clinic settings</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
