'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  AlertTriangle,
  Activity,
  FileText,
  ArrowRight,
  Target,
  Shield
} from 'lucide-react'

import { analyticsService } from '@/lib/services/analytics-service'
import { advancedAnalyticsService } from '@/lib/services/advanced-analytics-service'

interface DashboardMetrics {
  totalPatients: number
  activePatients: number
  monthlyRevenue: number
  revenueGrowth: number
  averageVisitsPerDay: number
  patientSatisfaction: number
  atRiskPatients: number
  appointmentCompletionRate: number
}

interface QuickInsight {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'stable'
  color: string
}

export default function AnalyticsOverview() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPatients: 0,
    activePatients: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0,
    averageVisitsPerDay: 0,
    patientSatisfaction: 0,
    atRiskPatients: 0,
    appointmentCompletionRate: 0
  })

  const quickInsights: QuickInsight[] = [
    {
      title: 'Revenue Growth',
      value: `${metrics.revenueGrowth.toFixed(1)}%`,
      change: 'vs last month',
      trend: metrics.revenueGrowth > 0 ? 'up' : metrics.revenueGrowth < 0 ? 'down' : 'stable',
      color: 'text-green-600'
    },
    {
      title: 'Patient Satisfaction',
      value: `${metrics.patientSatisfaction.toFixed(1)}/5.0`,
      change: '+0.2 vs last month',
      trend: 'up',
      color: 'text-blue-600'
    },
    {
      title: 'Completion Rate',
      value: `${metrics.appointmentCompletionRate.toFixed(0)}%`,
      change: 'appointment show-up',
      trend: 'stable',
      color: 'text-purple-600'
    },
    {
      title: 'Daily Visits',
      value: `${metrics.averageVisitsPerDay.toFixed(0)}`,
      change: 'average per day',
      trend: 'up',
      color: 'text-orange-600'
    }
  ]

  const analyticsModules = [
    {
      title: 'Advanced Analytics',
      description: 'Deep dive into business intelligence with forecasting and trend analysis',
      icon: BarChart3,
      href: '/dashboard/analytics/advanced',
      color: 'bg-blue-500',
      features: ['Revenue Forecasting', 'Patient Journey Analytics', 'Operational Insights', 'Performance Metrics']
    },
    {
      title: 'Patient Risk Analysis',
      description: 'Identify at-risk patients and improve retention rates',
      icon: AlertTriangle,
      href: '/dashboard/patient-risk',
      color: 'bg-red-500',
      features: ['Risk Scoring', 'Retention Analysis', 'Automated Alerts', 'Engagement Tracking']
    },
    {
      title: 'Reports & Exports',
      description: 'Generate comprehensive reports and export data for analysis',
      icon: FileText,
      href: '/dashboard/reports',
      color: 'bg-green-500',
      features: ['Financial Reports', 'Clinical Analytics', 'Regulatory Compliance', 'Custom Exports']
    },
    {
      title: 'Standard Analytics',
      description: 'Core clinic metrics and essential performance indicators',
      icon: Activity,
      href: '/dashboard/analytics',
      color: 'bg-purple-500',
      features: ['Patient Metrics', 'Revenue Tracking', 'Visit Analytics', 'Doctor Performance']
    }
  ]

  const loadMetrics = async () => {
    try {
      // Mock tenant ID - in real implementation, get from user session
      const mockTenantId = 'tenant-123'
      
      // Load basic analytics
      const analytics = await analyticsService.getAnalyticsData()
      
      // Load risk analysis data
      const riskData = await advancedAnalyticsService.getPatientRiskAnalysis(mockTenantId)
      
      setMetrics({
        totalPatients: analytics.totalPatients,
        activePatients: Math.floor(analytics.totalPatients * 0.75),
        monthlyRevenue: analytics.totalRevenue,
        revenueGrowth: 5.2 + Math.random() * 10, // Mock growth percentage
        averageVisitsPerDay: analytics.totalVisits / 30,
        patientSatisfaction: 4.2 + Math.random() * 0.6,
        atRiskPatients: riskData.length,
        appointmentCompletionRate: 78 + Math.random() * 15
      })
      
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900 font-semibold">Loading analytics overview...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights into your clinic performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Last updated</p>
                <p className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalPatients}</p>
                <p className="text-sm text-green-600 mt-1">
                  {metrics.activePatients} active this month
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{metrics.monthlyRevenue.toLocaleString()}</p>
                <p className={`text-sm mt-1 ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% vs last month
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">At-Risk Patients</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{metrics.atRiskPatients}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {((metrics.atRiskPatients / metrics.totalPatients) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Daily Visits</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.averageVisitsPerDay.toFixed(0)}</p>
                <p className="text-sm text-blue-600 mt-1">Average per day</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickInsights.map((insight, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {insight.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500 mr-1" />}
                  {insight.trend === 'down' && <TrendingUp className="w-5 h-5 text-red-500 mr-1 transform rotate-180" />}
                  {insight.trend === 'stable' && <Target className="w-5 h-5 text-gray-500 mr-1" />}
                </div>
                <p className={`text-2xl font-bold ${insight.color} mb-1`}>{insight.value}</p>
                <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                <p className="text-xs text-gray-500">{insight.change}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Modules */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Modules</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsModules.map((module, index) => {
              const IconComponent = module.icon
              
              return (
                <Link
                  key={index}
                  href={module.href}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg ${module.color} text-white group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                        <p className="text-sm text-gray-600">{module.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Key Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {module.features.map((feature, featureIndex) => (
                        <span key={featureIndex} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recommended Actions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-medium text-red-900">Urgent: Patient Retention</h3>
              </div>
              <p className="text-sm text-red-700 mb-3">
                {metrics.atRiskPatients} patients haven&apos;t visited in 60+ days
              </p>
              <Link
                href="/dashboard/patient-risk"
                className="inline-flex items-center space-x-1 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <span>Review at-risk patients</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">Opportunity: Revenue Growth</h3>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Implement follow-up campaigns to increase repeat visits
              </p>
              <Link
                href="/dashboard/analytics/advanced"
                className="inline-flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <span>View forecasting</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-900">Success: Performance Metrics</h3>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Patient satisfaction and completion rates are above average
              </p>
              <Link
                href="/dashboard/reports"
                className="inline-flex items-center space-x-1 text-sm font-medium text-green-600 hover:text-green-700"
              >
                <span>Generate report</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
