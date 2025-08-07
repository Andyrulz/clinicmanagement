'use client'

import React from 'react'
import { CalendarDashboard } from '@/components/appointments/calendar-dashboard'

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <CalendarDashboard />
      </div>
    </div>
  )
}
