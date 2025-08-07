'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AppointmentCalendarFallback } from '@/components/appointments/appointment-calendar-fallback'
import { QuickAppointmentForm } from '@/components/appointments/quick-appointment-form'
import { AppointmentStatusDashboard } from '@/components/appointments/appointment-status-dashboard'
import { CalendarEvent, CreateAppointmentRequest, AppointmentWithDetails } from '@/types/appointment'
import { Calendar, Plus, X } from 'lucide-react'

export default function CalendarTestPage() {
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<CreateAppointmentRequest | null>(null)

  const handleCreateAppointment = (appointment: CreateAppointmentRequest) => {
    console.log('Creating appointment:', appointment)
    setSelectedSlot(appointment)
    setShowAppointmentForm(true)
  }

  const handleAppointmentSelect = (event: CalendarEvent) => {
    console.log('Selected appointment:', event)
    setSelectedEvent(event)
  }

  const handleAppointmentCreated = (appointment: AppointmentWithDetails) => {
    console.log('Appointment created successfully:', appointment)
    setShowAppointmentForm(false)
    setSelectedSlot(null)
    // Refresh calendar would happen here
  }

  const handleCancelForm = () => {
    setShowAppointmentForm(false)
    setSelectedSlot(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Calendar & Appointment System Test
            </h1>
          </div>
          <Button
            onClick={() => setShowAppointmentForm(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Appointment</span>
          </Button>
        </div>

        {/* Status Dashboard */}
        <AppointmentStatusDashboard className="mb-6" />

        {/* Main Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Appointment Calendar</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentCalendarFallback
              onCreateAppointment={handleCreateAppointment}
              onAppointmentSelect={handleAppointmentSelect}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Selected Event Details */}
        {selectedEvent && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Appointment Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEvent(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Patient</label>
                  <p className="text-sm text-gray-900">{selectedEvent.patientName || selectedEvent.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Doctor</label>
                  <p className="text-sm text-gray-900">{selectedEvent.doctorName || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Time</label>
                  <p className="text-sm text-gray-900">
                    {selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedEvent.status}</p>
                </div>
                {selectedEvent.chiefComplaint && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Chief Complaint</label>
                    <p className="text-sm text-gray-900">{selectedEvent.chiefComplaint}</p>
                  </div>
                )}
                {selectedEvent.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{selectedEvent.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointment Form Modal */}
        {showAppointmentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Create New Appointment</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelForm}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <QuickAppointmentForm
                  selectedDate={selectedSlot?.appointment_date}
                  selectedTime={selectedSlot?.appointment_time}
                  onAppointmentCreated={handleAppointmentCreated}
                  onCancel={handleCancelForm}
                />
              </div>
            </div>
          </div>
        )}

        {/* Debug Information */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              <div>
                <span className="text-gray-500">Selected Event:</span>
                <span className="ml-2">{selectedEvent ? selectedEvent.id : 'None'}</span>
              </div>
              <div>
                <span className="text-gray-500">Selected Slot:</span>
                <span className="ml-2">
                  {selectedSlot ? `${selectedSlot.appointment_date} ${selectedSlot.appointment_time}` : 'None'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Form Open:</span>
                <span className="ml-2">{showAppointmentForm ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Notes */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm text-green-800">
              🚀 Calendar Implementation Complete - Day 3/14
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-green-700 space-y-2">
              <p>✅ React Big Calendar integration with 15-minute precision</p>
              <p>✅ Multi-doctor calendar coordination with filtering</p>
              <p>✅ Click-to-schedule functionality with slot selection</p>
              <p>✅ Appointment status visualization with color coding</p>
              <p>✅ Interactive appointment details and management</p>
              <p>✅ Real-time calendar events loading from appointment service</p>
              <p>🔄 Next: Drag-and-drop rescheduling and advanced calendar features</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
