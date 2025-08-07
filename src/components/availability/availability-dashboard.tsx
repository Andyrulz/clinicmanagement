'use client';

import { useState, useEffect } from 'react';
import DoctorAvailabilityForm from './doctor-availability-form';
import { AppointmentCalendarFallback } from '@/components/appointments/appointment-calendar-fallback';
import { createClient } from '@/lib/supabase/client';

interface AvailabilityDashboardProps {
  doctorId?: string;
  userRole?: string;
}

export default function AvailabilityDashboard({ 
  doctorId, 
  userRole = 'staff' 
}: AvailabilityDashboardProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'calendar' | 'manage'>('form');
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || '');
  
  const supabase = createClient();

  // Update selected doctor when doctorId prop changes
  useEffect(() => {
    if (doctorId) {
      setSelectedDoctorId(doctorId);
    }
  }, [doctorId]);

  // Get current user ID for RBAC
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        await supabase.auth.getUser();
        // User info loaded for auth purposes
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, [supabase]);

  const handleFormSuccess = () => {
    // Switch to calendar tab after form success
    setActiveTab('calendar');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'form':
        return (
          <DoctorAvailabilityForm
            doctorId={selectedDoctorId || doctorId}
            userRole={userRole}
            onSuccess={handleFormSuccess}
            onCancel={() => setActiveTab('calendar')}
          />
        );
      
      case 'calendar':
        return (
          <div className="space-y-4">
            {/* Header */}
            <div>
              <h2 className="text-xl font-semibold">Appointment Calendar & Availability</h2>
              <p className="text-gray-600 text-sm mt-1">
                View appointments, schedule availability, and create new appointments for doctors
              </p>
            </div>
            
            {/* Unified Calendar for Appointments and Availability */}
            <AppointmentCalendarFallback
              className="mt-4"
              onCreateAppointment={(appointment) => {
                // Redirect to appointment creation with pre-filled data
                window.location.href = `/dashboard/visits/create?doctor_id=${appointment.doctor_id}&visit_date=${appointment.appointment_date}&visit_time=${appointment.appointment_time}`;
              }}
              onAppointmentSelect={(event) => {
                // Redirect to appointment/visit details
                if (event.appointmentId) {
                  window.location.href = `/dashboard/visits/${event.appointmentId}`;
                }
              }}
            />
          </div>
        );
      
      case 'manage':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Manage Availability</h2>
            <p className="text-gray-600">
              Availability management features coming soon...
            </p>
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-gray-50 rounded">
                <h3 className="font-medium">Bulk Operations</h3>
                <p className="text-sm text-gray-600">Copy availability across multiple days/weeks</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h3 className="font-medium">Templates</h3>
                <p className="text-sm text-gray-600">Save and reuse availability patterns</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <h3 className="font-medium">Leave Management</h3>
                <p className="text-sm text-gray-600">Block dates for holidays and leave</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('form')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'form'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Add Availability
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🗓️ Calendar View
          </button>
          {(userRole === 'admin' || userRole === 'manager') && (
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Manage
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}
