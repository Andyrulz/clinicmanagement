'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  BarChart3,
  Download,
  ArrowLeft
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className="text-sm text-green-600 mt-1 font-medium">{change}</p>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface ChartCardProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}

function ChartCard({ title, children, action }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  height?: number
}

function SimpleBarChart({ data, height = 200 }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 0)
  
  return (
    <div style={{ height }} className="flex items-end space-x-2">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div 
            className={`w-full ${item.color || 'bg-blue-500'} rounded-t`}
            style={{ 
              height: maxValue > 0 ? `${(item.value / maxValue) * 80}%` : '0%',
              minHeight: '4px'
            }}
          />
          <div className="mt-2 text-xs text-gray-600 text-center">
            <div className="font-medium">{item.value}</div>
            <div className="truncate w-16">{item.label}</div>
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
            {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
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

  const loadAnalyticsData = async (timeframe: TimeframeType, range?: DateRange) => {
    try {
      setLoading(true)
      setError(null)
      const data = await analyticsService.getAnalyticsData(timeframe, range)
      setAnalyticsData(data)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyticsData(selectedTimeframe, customRange)
  }, [selectedTimeframe, customRange])

  const handleDateRangeChange = (timeframe: TimeframeType, newCustomRange?: DateRange) => {
    setSelectedTimeframe(timeframe)
    setCustomRange(newCustomRange)
  }

  const getTimeframeDays = () => {
    if (selectedTimeframe === 'custom' && customRange?.from && customRange?.to) {
      return Math.ceil((customRange.to.getTime() - customRange.from.getTime()) / (1000 * 60 * 60 * 24))
    }
    
    const dayMap: { [key in TimeframeType]?: number } = { '7d': 7, '2w': 14, '1m': 30, '3m': 90, '6m': 180 };
    return dayMap[selectedTimeframe] || 30
  }

  const exportReport = () => {
    if (!analyticsData) return
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeframe: selectedTimeframe,
      ...(selectedTimeframe === 'custom' && customRange && { 
        customRange: { 
          from: customRange.from.toISOString(), 
          to: customRange.to.toISOString() 
        } 
      }),
      summary: {
        totalPatients: analyticsData.totalPatients,
        totalVisits: analyticsData.totalVisits,
        totalRevenue: analyticsData.totalRevenue,
        collectionRate: analyticsData.collectionRate
      },
      ...analyticsData
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `clinic-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-xl w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="max-w-7xl mx-auto p-8 flex items-center justify-center">
          <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              type="button"
              onClick={() => loadAnalyticsData(selectedTimeframe, customRange)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
  
    if (!analyticsData) {
      return (
          <div className="max-w-7xl mx-auto p-8 flex items-center justify-center">
              <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No data available</h3>
                  <p className="text-gray-600 mb-8">There is no analytics data for the selected period.</p>
                   <div className="mt-6">
                      <DateRangeSelector
                        onDateRangeChange={handleDateRangeChange}
                        selectedTimeframe={selectedTimeframe}
                        customRange={customRange}
                      />
                   </div>
              </div>
          </div>
      );
    }

    const isShortTerm = getTimeframeDays() <= 14
    const isLongTerm = getTimeframeDays() >= 90

    const periodLabel = (() => {
      if (selectedTimeframe === 'custom' && customRange?.from && customRange?.to) {
        return `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`;
      }
      const labels: { [key in TimeframeType]?: string } = {
        '7d': 'last 7 days',
        '2w': 'last 2 weeks',
        '1m': 'this month',
        '3m': 'last 3 months',
        '6m': 'last 6 months',
      };
      return labels[selectedTimeframe] || 'this period';
    })();

    const overviewStats = [
      {
        title: 'Total Patients',
        value: analyticsData.totalPatients,
        change: `+${analyticsData.newPatientsThisMonth} in ${periodLabel}`,
        icon: <Users className="w-6 h-6 text-white" />,
        color: 'bg-gradient-to-r from-blue-500 to-blue-600'
      },
      {
        title: 'Total Visits',
        value: analyticsData.totalVisits,
        change: isShortTerm && analyticsData.visitsToday > 0 ? `${analyticsData.visitsToday} today` : '',
        icon: <Calendar className="w-6 h-6 text-white" />,
        color: 'bg-gradient-to-r from-green-500 to-green-600'
      },
      {
        title: `Revenue (${periodLabel})`,
        value: `₹${analyticsData.totalRevenue.toLocaleString()}`,
        change: isLongTerm ? `₹${analyticsData.revenueThisMonth.toLocaleString()} monthly avg` : '',
        icon: <DollarSign className="w-6 h-6 text-white" />,
        color: 'bg-gradient-to-r from-emerald-500 to-emerald-600'
      },
      {
        title: 'Collection Rate',
        value: `${analyticsData.collectionRate}%`,
        change: `₹${analyticsData.pendingPayments.toLocaleString()} pending`,
        icon: <TrendingUp className="w-6 h-6 text-white" />,
        color: 'bg-gradient-to-r from-purple-500 to-purple-600'
      }
    ]

    const visitTypeData = [
      { label: 'New', value: analyticsData.visitsByType.new, color: 'bg-blue-500' },
      { label: 'Follow-up', value: analyticsData.visitsByType.follow_up, color: 'bg-green-500' },
    ]

    const visitStatusData = [
      { label: 'Completed', value: analyticsData.visitsByStatus.completed, color: 'bg-green-500' },
      { label: 'Scheduled', value: analyticsData.visitsByStatus.scheduled, color: 'bg-blue-500' },
      { label: 'Cancelled', value: analyticsData.visitsByStatus.cancelled, color: 'bg-red-500' }
    ]

    const genderData = [
      { label: 'Male', value: analyticsData.patientsByGender.male, color: 'bg-blue-500' },
      { label: 'Female', value: analyticsData.patientsByGender.female, color: 'bg-pink-500' },
      { label: 'Other', value: analyticsData.patientsByGender.other, color: 'bg-gray-500' }
    ]

    const ageData = [
      { label: '0-18', value: analyticsData.patientsByAge['0-18'], color: 'bg-green-500' },
      { label: '19-35', value: analyticsData.patientsByAge['19-35'], color: 'bg-blue-500' },
      { label: '36-50', value: analyticsData.patientsByAge['36-50'], color: 'bg-yellow-500' },
      { label: '51-65', value: analyticsData.patientsByAge['51-65'], color: 'bg-orange-500' },
      { label: '65+', value: analyticsData.patientsByAge['65+'], color: 'bg-red-500' }
    ]

    return (
      <div className="max-w-7xl mx-auto p-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overviewStats.map((stat, index) => (
                <StatCard key={index} {...stat} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Visit Types">
                <SimpleBarChart data={visitTypeData} />
              </ChartCard>
              <ChartCard title="Visit Status">
                <SimplePieChart data={visitStatusData} />
              </ChartCard>
              <ChartCard title="Doctor Workload">
                <div className="space-y-3">
                  {analyticsData.doctorWorkload.slice(0, 5).map((doctor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{doctor.doctorName}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-900">{doctor.totalVisits} total</span>
                        <span className="text-sm text-blue-600">{doctor.todayVisits} today</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
              <ChartCard title="Revenue by Doctor">
                 <SimpleBarChart 
                    data={analyticsData.revenueByDoctor.slice(0, 5).map((d: { doctorName: string; revenue: number }) => ({ label: d.doctorName, value: d.revenue, color: 'bg-green-500' }))} 
                 />
              </ChartCard>
            </div>
          </div>
        )}
        {activeTab === 'patients' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Patient Demographics (Gender)">
                    <SimplePieChart data={genderData} />
                </ChartCard>
                <ChartCard title="Patient Demographics (Age)">
                    <SimpleBarChart data={ageData} />
                </ChartCard>
            </div>
        )}
        {activeTab === 'revenue' && (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Revenue Analytics</h3>
                <p className="text-gray-600">Revenue-specific analytics coming soon.</p>
            </div>
        )}
        {activeTab === 'clinical' && (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Clinical Performance</h3>
                <p className="text-gray-600">Clinical performance metrics coming soon.</p>
            </div>
        )}
      </div>
    )
  }

  const tabs: {id: 'overview' | 'patients' | 'revenue' | 'clinical', label: string, icon: React.ElementType}[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'clinical', label: 'Clinical', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
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
                  Analytics & Reports
                </h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive insights into your clinic&apos;s performance
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <DateRangeSelector
                onDateRangeChange={handleDateRangeChange}
                selectedTimeframe={selectedTimeframe}
                customRange={customRange}
              />
              <button
                onClick={() => window.open('/dashboard/analytics/advanced', '_blank')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Advanced Analytics</span>
              </button>
              <button
                onClick={exportReport}
                disabled={!analyticsData || loading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
          <div className="flex space-x-8 mt-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <main>
        {renderContent()}
      </main>
    </div>
  )
}
