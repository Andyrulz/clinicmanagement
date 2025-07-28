'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'

interface TimeSeriesData {
  date: string
  value: number
  label?: string
}

interface TrendChartProps {
  data: TimeSeriesData[]
  title: string
  height?: number
  color?: string
  showTrend?: boolean
}

export function TrendChart({ data, title, height = 200, color = 'bg-blue-500', showTrend = true }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center text-gray-500">No data available</div>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 0)
  const minValue = Math.min(...data.map(d => d.value), 0)
  const range = maxValue - minValue || 1

  // Calculate trend
  let trend = 0
  if (data.length >= 2 && showTrend) {
    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length
    trend = secondAvg - firstAvg
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showTrend && data.length >= 2 && (
          <div className={`flex items-center space-x-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${trend >= 0 ? '' : 'rotate-180'}`} />
            <span className="text-sm font-medium">
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      
      <div style={{ height }} className="relative">
        <div className="flex items-end h-full space-x-1">
          {data.map((item, index) => {
            const heightPercent = range > 0 ? ((item.value - minValue) / range) * 100 : 0
            return (
              <div key={index} className="flex-1 flex flex-col items-center group relative">
                <div className="relative w-full">
                  <div 
                    className={`w-full ${color} rounded-t transition-all duration-300 hover:opacity-80`}
                    style={{ 
                      height: `${Math.max(heightPercent, 2)}%`,
                      minHeight: '4px'
                    }}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {item.label || item.date}: {item.value}
                    </div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-gray-600 text-center">
                  <div className="font-medium">{item.value}</div>
                  <div className="truncate w-16">
                    {new Date(item.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    period: string
    isPositive?: boolean
  }
  icon: React.ReactNode
  color: string
  subtitle?: string
}

export function MetricCard({ title, value, change, icon, color, subtitle }: MetricCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change.isPositive !== false ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${change.isPositive !== false ? '' : 'rotate-180'}`} />
              <span>
                {change.isPositive !== false ? '+' : ''}{change.value}% {change.period}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface ComparisonChartProps {
  data: Array<{ 
    category: string
    current: number
    previous: number
    color?: string
  }>
  title: string
  height?: number
}

export function ComparisonChart({ data, title, height = 300 }: ComparisonChartProps) {
  const maxValue = Math.max(
    ...data.flatMap(d => [d.current, d.previous]),
    0
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="flex items-center space-x-4 mb-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600">Current Period</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span className="text-gray-600">Previous Period</span>
        </div>
      </div>
      
      <div style={{ height }} className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">{item.category}</span>
              <div className="flex space-x-4 text-sm text-gray-600">
                <span>{item.current}</span>
                <span className="text-gray-400">({item.previous})</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {/* Current period bar */}
              <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                <div 
                  className={`${item.color || 'bg-blue-500'} h-3 rounded-full transition-all duration-500`}
                  style={{ 
                    width: `${maxValue > 0 ? (item.current / maxValue) * 100 : 0}%`
                  }}
                />
              </div>
              
              {/* Previous period bar */}
              <div className="flex-1 bg-gray-100 rounded-full h-3 relative">
                <div 
                  className="bg-gray-300 h-3 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${maxValue > 0 ? (item.previous / maxValue) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface HeatmapProps {
  data: Array<{
    day: string
    hour: number
    value: number
  }>
  title: string
}

export function ActivityHeatmap({ data, title }: HeatmapProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 12 }, (_, i) => i + 9) // 9 AM to 8 PM
  
  const maxValue = Math.max(...data.map(d => d.value), 0)
  
  const getIntensity = (day: string, hour: number) => {
    const dataPoint = data.find(d => d.day === day && d.hour === hour)
    if (!dataPoint || maxValue === 0) return 0
    return (dataPoint.value / maxValue) * 100
  }
  
  const getValue = (day: string, hour: number) => {
    const dataPoint = data.find(d => d.day === day && d.hour === hour)
    return dataPoint?.value || 0
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="overflow-x-auto">
        <div className="grid grid-cols-13 gap-1 min-w-max">
          {/* Header with hours */}
          <div></div>
          {hours.map(hour => (
            <div key={hour} className="text-xs text-gray-600 text-center p-1">
              {hour}:00
            </div>
          ))}
          
          {/* Heatmap grid */}
          {days.map(day => (
            <React.Fragment key={day}>
              <div className="text-xs text-gray-600 p-1 font-medium">{day}</div>
              {hours.map(hour => {
                const intensity = getIntensity(day, hour)
                const value = getValue(day, hour)
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center text-xs relative group cursor-default"
                    style={{
                      backgroundColor: intensity > 0 
                        ? `rgba(59, 130, 246, ${intensity / 100})`
                        : '#f9fafb'
                    }}
                  >
                    {value > 0 && (
                      <span className={intensity > 50 ? 'text-white' : 'text-gray-700'}>
                        {value}
                      </span>
                    )}
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {day} {hour}:00 - {value} visits
                      </div>
                    </div>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4 text-xs text-gray-600">
        <span>Less activity</span>
        <div className="flex space-x-1">
          {[0, 25, 50, 75, 100].map(intensity => (
            <div
              key={intensity}
              className="w-3 h-3 rounded border border-gray-200"
              style={{
                backgroundColor: intensity > 0 
                  ? `rgba(59, 130, 246, ${intensity / 100})`
                  : '#f9fafb'
              }}
            />
          ))}
        </div>
        <span>More activity</span>
      </div>
    </div>
  )
}
