'use client'

import React, { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

interface DateRange {
  from: Date
  to: Date
}

type TimeframeType = '7d' | '2w' | '1m' | '3m' | '6m' | 'custom'

interface DateRangeSelectorProps {
  onDateRangeChange: (timeframe: TimeframeType, customRange?: DateRange) => void
  selectedTimeframe: TimeframeType
  customRange?: DateRange
}

export default function DateRangeSelector({ 
  onDateRangeChange, 
  selectedTimeframe, 
  customRange 
}: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [tempFromDate, setTempFromDate] = useState('')
  const [tempToDate, setTempToDate] = useState('')

  const timeframeOptions = [
    { label: 'Last 7 days', value: '7d' as TimeframeType },
    { label: 'Last 2 weeks', value: '2w' as TimeframeType },
    { label: 'Last month', value: '1m' as TimeframeType },
    { label: 'Last 3 months', value: '3m' as TimeframeType },
    { label: 'Last 6 months', value: '6m' as TimeframeType },
    { label: 'Custom range', value: 'custom' as TimeframeType }
  ]

  const handleTimeframeSelect = (timeframe: TimeframeType) => {
    if (timeframe === 'custom') {
      setShowCustomPicker(true)
      setIsOpen(false)
    } else {
      onDateRangeChange(timeframe)
      setIsOpen(false)
      setShowCustomPicker(false)
    }
  }

  const handleCustomRangeSubmit = () => {
    if (tempFromDate && tempToDate) {
      const fromDate = new Date(tempFromDate)
      const toDate = new Date(tempToDate)
      
      if (fromDate <= toDate) {
        onDateRangeChange('custom', { from: fromDate, to: toDate })
        setShowCustomPicker(false)
      }
    }
  }

  const formatDateRange = () => {
    if (selectedTimeframe === 'custom' && customRange) {
      return `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`
    }
    
    const option = timeframeOptions.find(opt => opt.value === selectedTimeframe)
    return option?.label || 'Last month'
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">{formatDateRange()}</span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTimeframeSelect(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  selectedTimeframe === option.value && option.value !== 'custom'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCustomPicker && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Select Custom Date Range</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={tempFromDate}
                onChange={(e) => setTempFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={tempToDate}
                onChange={(e) => setTempToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCustomRangeSubmit}
                disabled={!tempFromDate || !tempToDate}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply
              </button>
              <button
                onClick={() => setShowCustomPicker(false)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
