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
  Building,
  CheckCircle,
  XCircle
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
    <div className="group relative overflow-hidden bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Gradient Background Accent */}
      <div className={`absolute top-0 right-0 w-20 h-20 ${color} opacity-10 rounded-bl-full transform translate-x-6 -translate-y-6`}></div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          {href && (
            <div className="flex items-center text-gray-400 group-hover:text-blue-500 transition-colors duration-300">
              <ArrowRight className="w-5 h-5" />
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          {change && (
            <p className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block">
              {change}
            </p>
          )}
        </div>
      </div>
      
      {/* Hover Effect Border */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-100 rounded-xl transition-colors duration-300"></div>
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : content
}interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

function QuickAction({ title, description, icon, href, color }: QuickActionProps) {
  return (
    <Link href={href} className="block group">
      <div className="relative overflow-hidden bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        {/* Gradient Background */}
        <div className={`absolute inset-0 ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
        
        <div className="relative">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-xl ${color} shadow-md group-hover:scale-110 transition-transform duration-300`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-300">
                {title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {description}
              </p>
            </div>
            <div className="flex-shrink-0">
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </div>
        </div>
        
        {/* Animated Border */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-100 rounded-xl transition-colors duration-300"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Quick Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Overview</h2>
            <Link 
              href="/dashboard/analytics" 
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 hover:underline"
            >
              <span>View detailed analytics</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <QuickStat
              title="Total Patients"
              value={analyticsData?.totalPatients || 0}
              change={`+${analyticsData?.newPatientsThisMonth || 0} this month`}
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-blue-500 to-blue-600"
              href="/dashboard/patients"
            />
            <QuickStat
              title="Monthly Visits"
              value={analyticsData?.visitsThisMonth || 0}
              change={`${analyticsData?.visitsToday || 0} today`}
              icon={<Calendar className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-green-500 to-green-600"
              href="/dashboard/visits"
            />
            <QuickStat
              title="Monthly Revenue"
              value={`₹${(analyticsData?.revenueThisMonth || 0).toLocaleString()}`}
              change={`${analyticsData?.collectionRate || 0}% collection rate`}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-emerald-500 to-emerald-600"
              href="/dashboard/analytics"
            />
            <QuickStat
              title="Active Patients"
              value={analyticsData?.activePatients || 0}
              icon={<Activity className="w-6 h-6 text-white" />}
              color="bg-gradient-to-r from-purple-500 to-purple-600"
              href="/dashboard/patient-risk"
            />
          </div>
        </div>

        {/* Enhanced Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canManagePatients() && (
              <QuickAction
                title="Register New Patient"
                description="Add a new patient to the system with complete records"
                icon={<Users className="w-8 h-8 text-white" />}
                href="/dashboard/patients"
                color="bg-gradient-to-r from-blue-500 to-blue-600"
              />
            )}
            {canManageVisits() && (
              <QuickAction
                title="Manage Visits"
                description="Schedule and manage patient consultations"
                icon={<Plus className="w-8 h-8 text-white" />}
                href="/dashboard/visits"
                color="bg-gradient-to-r from-green-500 to-green-600"
              />
            )}
            {canAccessUserManagement() && (
              <QuickAction
                title="User Management"
                description="Manage doctors, staff and admin permissions"
                icon={<UserPlus className="w-8 h-8 text-white" />}
                href="/dashboard/users"
                color="bg-gradient-to-r from-indigo-500 to-indigo-600"
              />
            )}
          </div>
          
          {/* Second Row of Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Doctor Availability - Available for doctors and admin */}
            {(userRole === 'doctor' || canAccessUserManagement()) && (
              <QuickAction
                title="Doctor Availability"
                description="Manage doctor schedules and appointment slots"
                icon={<Calendar className="w-8 h-8 text-white" />}
                href="/dashboard/availability"
                color="bg-gradient-to-r from-orange-500 to-orange-600"
              />
            )}
            {canAccessAnalytics() && (
              <QuickAction
                title="View Analytics"
                description="Detailed clinic performance analytics"
                icon={<BarChart3 className="w-8 h-8 text-white" />}
                href="/dashboard/analytics"
                color="bg-gradient-to-r from-emerald-500 to-emerald-600"
              />
            )}
            {canAccessPatientRisk() && (
              <QuickAction
                title="Patient Risk Analysis"
                description="Monitor and track at-risk patients"
                icon={<AlertTriangle className="w-8 h-8 text-white" />}
                href="/dashboard/patient-risk"
                color="bg-gradient-to-r from-amber-500 to-amber-600"
              />
            )}
          </div>
        </div>

        {/* Enhanced Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Administrative Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Administration</h3>
              {canAccessUserManagement() && (
                <Link 
                  href="/dashboard/users" 
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                >
                  Manage Users
                </Link>
              )}
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-600 flex items-center">
                  <UserPlus className="w-5 h-5 mr-3 text-gray-400" />
                  Active Users
                </span>
                <span className="font-semibold text-gray-900">{analyticsData?.totalUsers || 5}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-600 flex items-center">
                  <Users className="w-5 h-5 mr-3 text-blue-500" />
                  Doctors
                </span>
                <span className="font-semibold text-blue-600">{analyticsData?.totalDoctors || 3}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-600 flex items-center">
                  <Building className="w-5 h-5 mr-3 text-green-500" />
                  Clinic Status
                </span>
                <span className="font-semibold text-green-600 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 flex items-center">
                  <Settings className="w-5 h-5 mr-3 text-gray-400" />
                  Your Role
                </span>
                <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                  userRole === 'admin' ? 'bg-red-100 text-red-700' :
                  userRole === 'manager' ? 'bg-blue-100 text-blue-700' :
                  userRole === 'doctor' ? 'bg-green-100 text-green-700' :
                  userRole === 'receptionist' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {userRole?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
            
            {canAccessTenantSettings() && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link 
                  href="/dashboard/tenant" 
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center font-medium hover:underline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Clinic Settings
                </Link>
              </div>
            )}
          </div>

          {/* Visit Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Visit Overview</h3>
              <Link 
                href="/dashboard/visits" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
              >
                View All
              </Link>
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                  Scheduled
                </span>
                <span className="font-semibold text-gray-900">{analyticsData?.visitsByStatus?.scheduled || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-gray-600 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                  Completed
                </span>
                <span className="font-semibold text-green-600">{analyticsData?.visitsByStatus?.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 flex items-center">
                  <XCircle className="w-5 h-5 mr-3 text-red-500" />
                  Cancelled
                </span>
                <span className="font-semibold text-red-600">{analyticsData?.visitsByStatus?.cancelled || 0}</span>
              </div>
            </div>
          </div>

          {/* Top Diagnoses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Common Diagnoses</h3>
              <Link 
                href="/dashboard/analytics" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
              >
                View Reports
              </Link>
            </div>
            
            <div className="space-y-4">
              {analyticsData?.commonDiagnoses?.slice(0, 5).map((diagnosis, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-b-0">
                  <span className="text-gray-700 text-sm font-medium">{diagnosis.diagnosis}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{diagnosis.count}</span>
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min((diagnosis.count / Math.max(...(analyticsData?.commonDiagnoses || []).map(d => d.count))) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No diagnosis data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Bottom Navigation */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {canManagePatients() && (
              <Link 
                href="/dashboard/patients" 
                className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-200 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">Patients</p>
                <p className="text-sm text-gray-600">Manage patient records and information</p>
              </Link>
            )}
            {canAccessAnalytics() && (
              <Link 
                href="/dashboard/analytics" 
                className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-green-200 transition-all duration-200 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">Analytics</p>
                <p className="text-sm text-gray-600">View detailed reports and insights</p>
              </Link>
            )}
            {canManageVisits() && (
              <Link 
                href="/dashboard/visits" 
                className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-orange-200 transition-all duration-200 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">Visits</p>
                <p className="text-sm text-gray-600">Schedule and manage appointments</p>
              </Link>
            )}
            {canManageVisits() && (
              <Link 
                href="/dashboard/calendar" 
                className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all duration-200 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">📅 Appointment Calendar</p>
                <p className="text-sm text-gray-600">Visual calendar for scheduling appointments</p>
              </Link>
            )}
          </div>
          
          {/* Second Row of Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {/* Reports - accessible to all roles */}
            <Link 
              href="/dashboard/reports" 
              className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-purple-200 transition-all duration-200 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <p className="font-semibold text-gray-900 mb-2">Reports</p>
              <p className="text-sm text-gray-600">Generate clinical and business reports</p>
            </Link>
            {canAccessUserManagement() && (
              <Link 
                href="/dashboard/users" 
                className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">User Management</p>
                <p className="text-sm text-gray-600">Manage staff and permissions</p>
              </Link>
            )}
            {canAccessTenantSettings() && (
              <Link 
                href="/dashboard/tenant" 
                className="group bg-white p-6 rounded-xl border border-gray-100 hover:shadow-lg hover:border-gray-300 transition-all duration-200 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <p className="font-semibold text-gray-900 mb-2">Clinic Settings</p>
                <p className="text-sm text-gray-600">Configure clinic preferences</p>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
