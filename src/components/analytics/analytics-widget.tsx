'use client'

import { useState, useEffect } from 'react'
import { analyticsService, type AnalyticsData } from '@/lib/services/analytics-service'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  Activity
} from 'lucide-react'
import Link from 'next/link'

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
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className="text-xs text-green-600 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-2 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
      {href && (
        <div className="flex items-center justify-end mt-2">
          <ArrowRight className="w-4 h-4 text-gray-400" />
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

interface AnalyticsWidgetProps {
  className?: string
}

export default function AnalyticsWidget({ className = '' }: AnalyticsWidgetProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadQuickAnalytics()
  }, [])

  const loadQuickAnalytics = async () => {
    try {
      setLoading(true)
      const data = await analyticsService.getAnalyticsData()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Quick Analytics</h3>
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load analytics data</p>
        <button
          onClick={loadQuickAnalytics}
          className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const quickStats = [
    {
      title: 'Total Patients',
      value: analyticsData.totalPatients,
      change: `+${analyticsData.newPatientsThisMonth} this month`,
      icon: <Users className="w-5 h-5 text-white" />,
      color: 'bg-blue-500',
      href: '/dashboard/analytics?tab=patients'
    },
    {
      title: "Today's Visits",
      value: analyticsData.visitsToday,
      change: `${analyticsData.visitsThisWeek} this week`,
      icon: <Calendar className="w-5 h-5 text-white" />,
      color: 'bg-green-500',
      href: '/dashboard/analytics?tab=overview'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${analyticsData.revenueThisMonth.toLocaleString()}`,
      change: `${analyticsData.collectionRate}% collected`,
      icon: <DollarSign className="w-5 h-5 text-white" />,
      color: 'bg-yellow-500',
      href: '/dashboard/analytics?tab=revenue'
    },
    {
      title: 'Pending Payments',
      value: `₹${analyticsData.pendingPayments.toLocaleString()}`,
      change: `${Math.round((analyticsData.pendingPayments / (analyticsData.totalRevenue + analyticsData.pendingPayments)) * 100)}% of total`,
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      color: 'bg-red-500',
      href: '/dashboard/reports'
    }
  ]

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Analytics</h3>
        <Link 
          href="/dashboard/analytics"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <QuickStat key={index} {...stat} />
        ))}
      </div>

      {/* Quick Insights */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Today&apos;s Insights</h4>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-center justify-between">
            <span>Average visits per patient:</span>
            <span className="font-medium">{analyticsData.averageVisitsPerPatient}</span>
          </div>
          {analyticsData.revenueByDoctor.length > 0 && (
            <div className="flex items-center justify-between">
              <span>Top performing doctor:</span>
              <span className="font-medium">{analyticsData.revenueByDoctor[0]?.doctorName}</span>
            </div>
          )}
          {analyticsData.commonDiagnoses.length > 0 && (
            <div className="flex items-center justify-between">
              <span>Most common diagnosis:</span>
              <span className="font-medium">{analyticsData.commonDiagnoses[0]?.diagnosis}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
