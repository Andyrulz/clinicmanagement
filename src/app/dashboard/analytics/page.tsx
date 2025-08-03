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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      );
    }
  
    if (error) {
      return (
        <div className="max-w-7xl mx-auto p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => loadAnalyticsData(selectedTimeframe, customRange)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
  
    if (!analyticsData) {
      return (
          <div className="max-w-7xl mx-auto p-6 flex items-center justify-center">
              <div className="text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                  <p className="mt-1 text-sm text-gray-500">There is no analytics data for the selected period.</p>
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
        color: 'bg-blue-500'
      },
      {
        title: 'Total Visits',
        value: analyticsData.totalVisits,
        change: isShortTerm && analyticsData.visitsToday > 0 ? `${analyticsData.visitsToday} today` : '',
        icon: <Calendar className="w-6 h-6 text-white" />,
        color: 'bg-green-500'
      },
      {
        title: `Revenue (${periodLabel})`,
        value: `₹${analyticsData.totalRevenue.toLocaleString()}`,
        change: isLongTerm ? `₹${analyticsData.revenueThisMonth.toLocaleString()} monthly avg` : '',
        icon: <DollarSign className="w-6 h-6 text-white" />,
        color: 'bg-yellow-500'
      },
      {
        title: 'Collection Rate',
        value: `${analyticsData.collectionRate}%`,
        change: `₹${analyticsData.pendingPayments.toLocaleString()} pending`,
        icon: <TrendingUp className="w-6 h-6 text-white" />,
        color: 'bg-purple-500'
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
      <div className="max-w-7xl mx-auto p-6">
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
            <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto" />
                <p className="mt-4">Revenue-specific analytics coming soon.</p>
            </div>
        )}
        {activeTab === 'clinical' && (
            <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto" />
                <p className="mt-4">Clinical performance metrics coming soon.</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics &amp; Reports</h1>
                <p className="text-gray-600 mt-1">Comprehensive insights into your clinic&apos;s performance</p>
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
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Advanced Analytics</span>
              </button>
              <button
                onClick={exportReport}
                disabled={!analyticsData || loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
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
                className={`flex items-center space-x-2 px-1 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
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
