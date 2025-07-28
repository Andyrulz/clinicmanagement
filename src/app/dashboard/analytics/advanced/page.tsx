'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Activity,
  Clock
} from 'lucide-react'

import { analyticsService, AnalyticsService } from '@/lib/services/analytics-service'
import { advancedAnalyticsService, AdvancedAnalyticsService } from '@/lib/services/advanced-analytics-service'
import type { AnalyticsData, DateRange, TimeframeType } from '@/lib/services/analytics-service'
import type { BusinessMetrics, PatientJourneyAnalytics, DoctorPerformanceMetrics, OperationalInsights } from '@/lib/services/advanced-analytics-service'
import DateRangeSelector from '@/components/analytics/date-range-selector'
import { TrendChart, MetricCard, ComparisonChart, ActivityHeatmap } from '@/components/analytics/advanced-charts'

export default function AdvancedAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'insights' | 'forecasting' | 'patients'>('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('1m')
  const [customRange, setCustomRange] = useState<DateRange>()
  
  // Analytics data states
  const [basicAnalytics, setBasicAnalytics] = useState<AnalyticsData | null>(null)
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null)
  const [patientJourney, setPatientJourney] = useState<PatientJourneyAnalytics | null>(null)
  const [doctorPerformance, setDoctorPerformance] = useState<DoctorPerformanceMetrics[]>([])
  const [operationalInsights, setOperationalInsights] = useState<OperationalInsights | null>(null)
  
  // Error states
  const [error, setError] = useState<string | null>(null)

  const loadAllAnalytics = async (timeframe: TimeframeType, range?: DateRange) => {
    try {
      setRefreshing(true)
      setError(null)
      
      // Load basic analytics (existing)
      const basicData = await analyticsService.getAnalyticsData(timeframe, range)
      setBasicAnalytics(basicData)
      
      // Get tenant ID from user session
      // For now, we'll simulate advanced analytics data
      const mockTenantId = 'tenant-123'
      const dateRange = range || AnalyticsService.getDateRangeFromTimeframe(timeframe)
      
      // Load advanced analytics in parallel
      const [
        businessData,
        journeyData,
        performanceData,
        insightsData
      ] = await Promise.all([
        advancedAnalyticsService.getBusinessMetrics(mockTenantId, dateRange),
        advancedAnalyticsService.getPatientJourneyAnalytics(mockTenantId, dateRange),
        AdvancedAnalyticsService.getDoctorPerformanceMetrics(mockTenantId),
        advancedAnalyticsService.getOperationalInsights(mockTenantId, dateRange)
      ])
      
      setBusinessMetrics(businessData)
      setPatientJourney(journeyData)
      setDoctorPerformance(performanceData)
      setOperationalInsights(insightsData)
      
    } catch (err) {
      console.error('Error loading advanced analytics:', err)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAllAnalytics(selectedTimeframe, customRange)
  }, [selectedTimeframe, customRange])

  const handleDateRangeChange = (timeframe: TimeframeType, newCustomRange?: DateRange) => {
    setSelectedTimeframe(timeframe)
    setCustomRange(newCustomRange)
  }

  const handleRefresh = () => {
    loadAllAnalytics(selectedTimeframe, customRange)
  }

  const exportDetailedReport = () => {
    if (!basicAnalytics || !businessMetrics) return
    
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeframe: selectedTimeframe,
      ...(selectedTimeframe === 'custom' && customRange && { 
        customRange: { 
          from: customRange.from.toISOString(), 
          to: customRange.to.toISOString() 
        } 
      }),
      basicAnalytics,
      businessMetrics,
      patientJourney,
      doctorPerformance,
      operationalInsights,
      recommendations: generateRecommendations()
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `detailed-analytics-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateRecommendations = () => {
    const recommendations = []
    
    if (businessMetrics) {
      if (businessMetrics.paymentComplianceRate < 80) {
        recommendations.push({
          priority: 'high',
          category: 'Revenue',
          issue: 'Low payment compliance rate',
          suggestion: 'Implement automated payment reminders and require upfront payments'
        })
      }
      
      if (businessMetrics.patientRetentionRate < 70) {
        recommendations.push({
          priority: 'medium',
          category: 'Patient Care',
          issue: 'Low patient retention',
          suggestion: 'Improve follow-up communication and patient experience programs'
        })
      }
      
      if (businessMetrics.doctorUtilizationRate < 75) {
        recommendations.push({
          priority: 'medium',
          category: 'Operations',
          issue: 'Low doctor utilization',
          suggestion: 'Optimize scheduling and consider expanding service hours'
        })
      }
    }
    
    return recommendations
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900 font-semibold">Loading advanced analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Business Overview', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: Target },
    { id: 'insights', label: 'Operational Insights', icon: Activity },
    { id: 'patients', label: 'Patient Analytics', icon: Users },
    { id: 'forecasting', label: 'Forecasting', icon: TrendingUp }
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics & Business Intelligence</h1>
              <p className="text-gray-600 mt-1">Deep insights into clinic performance and growth opportunities</p>
            </div>
            <div className="flex items-center space-x-4">
              <DateRangeSelector
                onDateRangeChange={handleDateRangeChange}
                selectedTimeframe={selectedTimeframe}
                customRange={customRange}
              />
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportDetailedReport}
                disabled={!basicAnalytics || !businessMetrics}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </button>
            </div>
          </div>
          
          {/* Tab Navigation */}
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

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'insights' && renderInsightsTab()}
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'forecasting' && renderForecastingTab()}
      </main>
    </div>
  )

  function renderOverviewTab() {
    if (!businessMetrics || !basicAnalytics) return null

    const keyMetrics = [
      {
        title: 'Revenue Growth Rate',
        value: `${businessMetrics.revenueGrowthRate > 0 ? '+' : ''}${businessMetrics.revenueGrowthRate.toFixed(1)}%`,
        change: { value: Math.abs(businessMetrics.revenueGrowthRate), period: 'vs last period', isPositive: businessMetrics.revenueGrowthRate >= 0 },
        icon: <DollarSign className="w-6 h-6 text-white" />,
        color: 'bg-green-500',
        subtitle: `₹${businessMetrics.averageRevenuePerPatient.toFixed(0)} avg per patient`
      },
      {
        title: 'Patient Retention Rate',
        value: `${businessMetrics.patientRetentionRate}%`,
        change: { value: 5.2, period: 'vs last period', isPositive: true },
        icon: <Users className="w-6 h-6 text-white" />,
        color: 'bg-blue-500',
        subtitle: `${businessMetrics.averageVisitsPerPatient.toFixed(1)} avg visits per patient`
      },
      {
        title: 'Doctor Utilization',
        value: `${businessMetrics.doctorUtilizationRate}%`,
        change: { value: 2.8, period: 'vs last period', isPositive: true },
        icon: <Activity className="w-6 h-6 text-white" />,
        color: 'bg-purple-500',
        subtitle: `${businessMetrics.averageWaitTime} min avg wait time`
      },
      {
        title: 'Payment Compliance',
        value: `${businessMetrics.paymentComplianceRate.toFixed(1)}%`,
        change: { value: 3.4, period: 'vs last period', isPositive: false },
        icon: <Target className="w-6 h-6 text-white" />,
        color: 'bg-orange-500',
        subtitle: `₹${businessMetrics.outstandingAmount.toFixed(0)} outstanding`
      }
    ]

    // Generate trend data for revenue
    const revenueTrendData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      value: Math.floor(Math.random() * 5000) + 2000 + (i * 50), // Simulated upward trend
      label: `Day ${i + 1}`
    }))

    const visitTrendData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      value: Math.floor(Math.random() * 20) + 10,
      label: `Day ${i + 1}`
    }))

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {keyMetrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart
            data={revenueTrendData}
            title="Revenue Trend (30 Days)"
            color="bg-green-500"
            showTrend={true}
          />
          <TrendChart
            data={visitTrendData}
            title="Daily Visits Trend"
            color="bg-blue-500"
            showTrend={true}
          />
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Recommendations</h3>
          <div className="space-y-4">
            {generateRecommendations().map((rec, index) => (
              <div key={index} className={`flex items-start space-x-3 p-4 rounded-lg ${
                rec.priority === 'high' ? 'bg-red-50 border border-red-200' :
                rec.priority === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  rec.priority === 'high' ? 'text-red-500' :
                  rec.priority === 'medium' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{rec.category}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{rec.issue}</p>
                  <p className="text-sm text-gray-800 mt-2 font-medium">💡 {rec.suggestion}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function renderPerformanceTab() {
    if (!doctorPerformance.length) return <div>Loading performance data...</div>

    const topPerformers = [...doctorPerformance]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)

    const performanceComparisonData = doctorPerformance.map(doctor => ({
      category: doctor.doctorName,
      current: doctor.totalVisits,
      previous: Math.floor(doctor.totalVisits * 0.9), // Simulated previous period
      color: 'bg-blue-500'
    }))

    return (
      <div className="space-y-6">
        {/* Top Performers */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Doctors</h3>
          <div className="space-y-4">
            {topPerformers.map((doctor, index) => (
              <div key={doctor.doctorId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doctor.doctorName}</p>
                    <p className="text-sm text-gray-600">{doctor.totalVisits} visits</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₹{doctor.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">₹{doctor.avgRevenuePerVisit.toFixed(0)} per visit</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Comparison */}
        <ComparisonChart
          data={performanceComparisonData}
          title="Doctor Visit Volume: Current vs Previous Period"
          height={300}
        />

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctorPerformance.map(doctor => (
            <div key={doctor.doctorId} className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">{doctor.doctorName}</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Visits</span>
                  <span className="text-sm font-medium">{doctor.totalVisits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg/Day</span>
                  <span className="text-sm font-medium">{doctor.avgVisitsPerDay.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Revenue</span>
                  <span className="text-sm font-medium">₹{doctor.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Satisfaction</span>
                  <span className="text-sm font-medium">{doctor.patientSatisfactionScore}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">No-show Rate</span>
                  <span className={`text-sm font-medium ${doctor.noShowRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {doctor.noShowRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderInsightsTab() {
    if (!operationalInsights) return <div>Loading operational insights...</div>

    // Generate mock heatmap data for activity patterns
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const hours = Array.from({ length: 12 }, (_, i) => i + 9) // 9 AM to 8 PM
    
    const heatmapData = days.flatMap(day => 
      hours.map(hour => ({
        day,
        hour,
        value: Math.floor(Math.random() * 15) + 1
      }))
    )

    return (
      <div className="space-y-6">
        {/* Capacity Utilization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Capacity Utilization"
            value={`${operationalInsights.currentCapacityUtilization.toFixed(1)}%`}
            icon={<Activity className="w-6 h-6 text-white" />}
            color="bg-blue-500"
            subtitle="Current efficiency"
          />
          <MetricCard
            title="Revenue per Patient"
            value={`₹${operationalInsights.costPerPatient * 3}`}
            icon={<DollarSign className="w-6 h-6 text-white" />}
            color="bg-green-500"
            subtitle="Average value"
          />
          <MetricCard
            title="Missed Revenue"
            value={`₹${operationalInsights.missedAppointmentRevenue.toLocaleString()}`}
            icon={<AlertTriangle className="w-6 h-6 text-white" />}
            color="bg-red-500"
            subtitle="From no-shows"
          />
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap
          data={heatmapData}
          title="Weekly Activity Pattern"
        />

        {/* Bottlenecks and Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Operational Bottlenecks</h3>
            <div className="space-y-4">
              {operationalInsights.bottlenecks.map((bottleneck, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{bottleneck.area}</p>
                    <p className="text-sm text-gray-600">Impact: {bottleneck.impact}</p>
                    <p className="text-sm text-blue-600 mt-1">💡 {bottleneck.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Opportunities</h3>
            <div className="space-y-4">
              {operationalInsights.expansionOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{opportunity.area}</p>
                    <p className="text-sm text-gray-600">Potential: ₹{opportunity.potential.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Efficiency */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Efficiency Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {operationalInsights.staffEfficiency.map((staff, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">{staff.role}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Efficiency</span>
                    <span className={`text-sm font-medium ${staff.efficiency > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {staff.efficiency}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Workload</span>
                    <span className={`text-sm font-medium ${staff.workload > 90 ? 'text-red-600' : 'text-blue-600'}`}>
                      {staff.workload}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function renderPatientsTab() {
    if (!patientJourney) return <div>Loading patient analytics...</div>

    return (
      <div className="space-y-6">
        {/* Patient Journey Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Avg Time to First Visit"
            value={`${patientJourney.avgTimeToFirstVisit} days`}
            icon={<Clock className="w-6 h-6 text-white" />}
            color="bg-blue-500"
          />
          <MetricCard
            title="Registration Conversion"
            value={`${patientJourney.registrationConversionRate}%`}
            icon={<Target className="w-6 h-6 text-white" />}
            color="bg-green-500"
          />
          <MetricCard
            title="Avg Days Between Visits"
            value={`${patientJourney.avgTimeBetweenVisits} days`}
            icon={<Calendar className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
          <MetricCard
            title="Treatment Completion"
            value={`${patientJourney.treatmentCompletionRate}%`}
            icon={<Activity className="w-6 h-6 text-white" />}
            color="bg-orange-500"
          />
        </div>

        {/* Visit Frequency Distribution */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Visit Frequency Distribution</h3>
          <div className="space-y-4">
            {patientJourney.visitFrequencyDistribution.map((freq, index) => {
              const total = patientJourney.visitFrequencyDistribution.reduce((sum, f) => sum + f.count, 0)
              const percentage = total > 0 ? (freq.count / total) * 100 : 0
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-24 text-sm text-gray-600">{freq.range}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-medium text-gray-900 text-right">
                    {freq.count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* High Value Patients */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">High Value Patients</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Patient</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Total Spent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Visit Count</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Last Visit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Avg per Visit</th>
                </tr>
              </thead>
              <tbody>
                {patientJourney.highValuePatients.map((patient) => (
                  <tr key={patient.patientId} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {patient.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{patient.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-green-600">
                      ₹{patient.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900">{patient.visitCount}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(patient.lastVisit).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      ₹{(patient.totalSpent / patient.visitCount).toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  function renderForecastingTab() {
    // Generate mock forecasting data
    const revenueForecasting = Array.from({ length: 6 }, (_, i) => {
      const baseRevenue = 50000
      const growth = i * 2000
      const seasonality = Math.sin((i / 6) * Math.PI) * 5000
      
      return {
        month: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        projected: baseRevenue + growth + seasonality,
        confidence: Math.max(90 - i * 10, 50)
      }
    })

    const patientGrowthForecasting = Array.from({ length: 6 }, (_, i) => {
      const basePatients = 200
      const growth = i * 15
      
      return {
        month: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        projected: basePatients + growth,
        confidence: Math.max(85 - i * 8, 45)
      }
    })

    return (
      <div className="space-y-6">
        {/* Forecasting Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="6-Month Revenue Projection"
            value={`₹${revenueForecasting[5]?.projected.toLocaleString()}`}
            change={{ value: 12.5, period: 'projected growth', isPositive: true }}
            icon={<TrendingUp className="w-6 h-6 text-white" />}
            color="bg-green-500"
            subtitle={`${revenueForecasting[5]?.confidence}% confidence`}
          />
          <MetricCard
            title="Patient Growth Projection"
            value={`${patientGrowthForecasting[5]?.projected}`}
            change={{ value: 8.2, period: 'projected growth', isPositive: true }}
            icon={<Users className="w-6 h-6 text-white" />}
            color="bg-blue-500"
            subtitle={`${patientGrowthForecasting[5]?.confidence}% confidence`}
          />
          <MetricCard
            title="Capacity Requirements"
            value="125%"
            change={{ value: 25, period: 'increase needed', isPositive: false }}
            icon={<AlertTriangle className="w-6 h-6 text-white" />}
            color="bg-orange-500"
            subtitle="By month 6"
          />
        </div>

        {/* Revenue Forecasting Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecasting (6 Months)</h3>
          <div className="space-y-4">
            {revenueForecasting.map((forecast, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium text-gray-900">{forecast.month}</div>
                <div className="flex-1 relative">
                  <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full transition-all duration-1000"
                      style={{ width: `${(forecast.projected / Math.max(...revenueForecasting.map(f => f.projected))) * 100}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-xs font-medium text-white">
                        ₹{(forecast.projected / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-sm text-gray-600 text-right">
                  {forecast.confidence}% conf.
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Scenarios</h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900">Optimistic Scenario (30% probability)</h4>
                <p className="text-sm text-green-700 mt-1">
                  +25% revenue growth, 95% patient retention, new service expansion
                </p>
                <p className="text-lg font-bold text-green-900 mt-2">₹750K revenue by month 6</p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900">Most Likely Scenario (50% probability)</h4>
                <p className="text-sm text-blue-700 mt-1">
                  +15% revenue growth, 85% patient retention, steady operations
                </p>
                <p className="text-lg font-bold text-blue-900 mt-2">₹620K revenue by month 6</p>
              </div>
              
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900">Conservative Scenario (20% probability)</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  +8% revenue growth, 75% patient retention, market challenges
                </p>
                <p className="text-lg font-bold text-yellow-900 mt-2">₹540K revenue by month 6</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Increase Marketing Investment</p>
                  <p className="text-sm text-gray-600">Target 20% increase in new patient acquisition</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Expand Service Hours</p>
                  <p className="text-sm text-gray-600">Add evening slots to increase capacity by 30%</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Implement Retention Program</p>
                  <p className="text-sm text-gray-600">Focus on at-risk patient segments</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Activity className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Technology Upgrade</p>
                  <p className="text-sm text-gray-600">Implement telemedicine for follow-ups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
