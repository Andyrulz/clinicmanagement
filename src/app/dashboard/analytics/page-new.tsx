'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  BarChart3,
  Download
} from 'lucide-react'

// Import types and service separately to avoid potential circular imports
import type { AnalyticsData, DateRange, TimeframeType } from '@/lib/services/analytics-service'
import { analyticsService } from '@/lib/services/analytics-service'
import DateRangeSelector from '@/components/analytics/date-range-selector'

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number }>
  color: string
}

function SimpleBarChart({ data, color }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(item => item.value))
  
  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div className="w-16 text-xs text-gray-600 text-right">
            {item.label}
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
            <div 
              className={`h-3 rounded-full ${color}`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <div className="w-12 text-xs text-gray-900 font-medium">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

interface SimplePieChartProps {
  data: Array<{ label: string; value: number; color: string }>
}

function SimplePieChart({ data }: SimplePieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="flex items-center space-x-3">
          <div 
            className={`w-4 h-4 rounded ${item.color}`}
          />
          <span className="text-sm text-gray-600 flex-1">{item.label}</span>
          <span className="text-sm font-medium text-gray-900">
            {item.value} ({Math.round((item.value / total) * 100)}%)
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'revenue' | 'clinical'>('overview')
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('1m')
  const [customRange, setCustomRange] = useState<DateRange>()

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async (timeframe: TimeframeType = '1m', customRange?: DateRange) => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getAnalyticsData(timeframe, customRange)
      setAnalyticsData(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (timeframe: TimeframeType, newCustomRange?: DateRange) => {
    setSelectedTimeframe(timeframe)
    setCustomRange(newCustomRange)
    loadAnalyticsData(timeframe, newCustomRange)
  }

  const getTimeframeDays = () => {
    if (selectedTimeframe === 'custom' && customRange) {
      return Math.ceil((customRange.to.getTime() - customRange.from.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    const dayMap: Record<Exclude<TimeframeType, 'custom'>, number> = { '7d': 7, '2w': 14, '1m': 30, '3m': 90, '6m': 180 }
    return selectedTimeframe === 'custom' ? 30 : dayMap[selectedTimeframe]
  }

  const isShortTerm = getTimeframeDays() <= 14

  if (error) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) return null

  const periodLabel = {
    '7d': 'last 7 days',
    '2w': 'last 2 weeks', 
    '1m': 'last month',
    '3m': 'last 3 months',
    '6m': 'last 6 months',
    'custom': 'selected period'
  }[selectedTimeframe] || 'this period'

  const statCards = [
    {
      title: 'Total Patients',
      value: analyticsData.totalPatients.toLocaleString(),
      change: isShortTerm ? `+${analyticsData.newPatientsThisMonth} this month` : '',
      icon: <Users className="h-6 w-6 text-white" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Visits',
      value: analyticsData.totalVisits.toLocaleString(),
      change: isShortTerm && analyticsData.visitsToday > 0 ? `${analyticsData.visitsToday} today` : '',
      icon: <Calendar className="h-6 w-6 text-white" />,
      color: 'bg-green-500'
    },
    {
      title: `Revenue (${periodLabel})`,
      value: `$${analyticsData.totalRevenue.toLocaleString()}`,
      change: analyticsData.pendingPayments > 0 ? `$${analyticsData.pendingPayments} pending` : '',
      icon: <DollarSign className="h-6 w-6 text-white" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Collection Rate',
      value: `${analyticsData.collectionRate}%`,
      change: analyticsData.collectionRate >= 85 ? 'Excellent' : 'Needs attention',
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Comprehensive view of your clinic&apos;s performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <DateRangeSelector
                selectedTimeframe={selectedTimeframe}
                customRange={customRange}
                onDateRangeChange={handleDateRangeChange}
              />
              <button
                onClick={() => {/* Export functionality */}}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <StatCard key={index} {...card} />
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: BarChart3 },
              { key: 'patients', label: 'Patients', icon: Users },
              { key: 'revenue', label: 'Revenue', icon: DollarSign },
              { key: 'clinical', label: 'Clinical', icon: Activity }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as 'overview' | 'patients' | 'revenue' | 'clinical')}
                className={`${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm inline-flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Visit Trends</h3>
              <SimpleBarChart 
                data={[
                  { label: 'Mon', value: 12 },
                  { label: 'Tue', value: 15 },
                  { label: 'Wed', value: 8 },
                  { label: 'Thu', value: 18 },
                  { label: 'Fri', value: 22 },
                  { label: 'Sat', value: 6 },
                  { label: 'Sun', value: 3 }
                ]}
                color="bg-blue-500"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Distribution by Gender</h3>
              <SimplePieChart 
                data={[
                  { label: 'Male', value: analyticsData.patientsByGender.male, color: 'bg-blue-500' },
                  { label: 'Female', value: analyticsData.patientsByGender.female, color: 'bg-pink-500' },
                  { label: 'Other', value: analyticsData.patientsByGender.other, color: 'bg-gray-500' }
                ]}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Age Groups</h3>
              <SimplePieChart 
                data={[
                  { label: '0-18', value: analyticsData.patientsByAge['0-18'], color: 'bg-green-500' },
                  { label: '19-35', value: analyticsData.patientsByAge['19-35'], color: 'bg-blue-500' },
                  { label: '36-50', value: analyticsData.patientsByAge['36-50'], color: 'bg-purple-500' },
                  { label: '51-65', value: analyticsData.patientsByAge['51-65'], color: 'bg-orange-500' },
                  { label: '65+', value: analyticsData.patientsByAge['65+'], color: 'bg-red-500' }
                ]}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Visit Status Distribution</h3>
              <SimplePieChart 
                data={[
                  { label: 'Scheduled', value: analyticsData.visitsByStatus.scheduled, color: 'bg-yellow-500' },
                  { label: 'Completed', value: analyticsData.visitsByStatus.completed, color: 'bg-green-500' },
                  { label: 'Cancelled', value: analyticsData.visitsByStatus.cancelled, color: 'bg-red-500' }
                ]}
              />
            </div>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Patients Trend</h3>
              <p className="text-3xl font-bold text-blue-600">{analyticsData.newPatientsThisMonth}</p>
              <p className="text-sm text-gray-500">New patients this month</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Patients</h3>
              <p className="text-3xl font-bold text-green-600">{analyticsData.activePatients}</p>
              <p className="text-sm text-gray-500">Patients with visits in the last 3 months</p>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Doctor</h3>
              <div className="space-y-4">
                {analyticsData.revenueByDoctor.map((doctor, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{doctor.doctorName}</span>
                    <span className="text-sm text-gray-600">${doctor.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Analytics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Collection Rate</span>
                  <span className="text-sm font-medium">{analyticsData.collectionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending Payments</span>
                  <span className="text-sm font-medium">${analyticsData.pendingPayments.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Consultation Fee</span>
                  <span className="text-sm font-medium">${analyticsData.averageConsultationFee}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clinical' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Common Diagnoses</h3>
              <div className="space-y-3">
                {analyticsData.commonDiagnoses.slice(0, 5).map((diagnosis, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-900">{diagnosis.diagnosis}</span>
                    <span className="text-sm font-medium text-gray-600">{diagnosis.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Clinical Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Prescriptions</span>
                  <span className="text-sm font-medium">{analyticsData.prescriptionStats.totalPrescriptions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Unique Medications</span>
                  <span className="text-sm font-medium">{analyticsData.prescriptionStats.uniqueMedications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Follow-up Compliance</span>
                  <span className="text-sm font-medium">{analyticsData.followUpCompliance}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
