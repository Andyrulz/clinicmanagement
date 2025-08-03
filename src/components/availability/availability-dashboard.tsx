'use client';

import { useState, useEffect } from 'react';
import DoctorAvailabilityForm from './doctor-availability-form';
import { GoogleStyleCalendar } from './google-style-calendar';
import { createClient } from '@/lib/supabase/client';

interface AvailabilityDashboardProps {
  doctorId?: string;
  userRole?: string;
}

interface Doctor {
  id: string;
  full_name: string;
}

export default function AvailabilityDashboard({ 
  doctorId, 
  userRole = 'staff' 
}: AvailabilityDashboardProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'calendar' | 'manage'>('form');
  const [calendarKey, setCalendarKey] = useState(0); // Force calendar refresh
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctorId || '');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  const supabase = createClient();
  const canSelectDoctor = userRole === 'admin' || userRole === 'manager';

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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, [supabase]);

  // Load doctors for filtering
  useEffect(() => {
    const loadDoctors = async () => {
      if (!canSelectDoctor) return;

      try {
        const { data: doctorsList, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'doctor')
          .eq('is_active', true)
          .order('full_name');

        if (error) {
          console.error('Error loading doctors:', error);
          return;
        }

        setDoctors(doctorsList || []);
        
        // Auto-select first doctor if none is selected and we have doctors
        if (!selectedDoctorId && doctorsList && doctorsList.length > 0) {
          setSelectedDoctorId(doctorsList[0].id);
        }
      } catch (error) {
        console.error('Error loading doctors:', error);
      }
    };

    loadDoctors();
  }, [canSelectDoctor, supabase, selectedDoctorId]);

  const handleFormSuccess = () => {
    // Force calendar refresh and switch to calendar tab
    setCalendarKey(prev => prev + 1);
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
            {/* Doctor Filter */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Doctor Availability Calendar</h2>
              {canSelectDoctor && doctors.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="doctor-filter" className="text-sm font-medium text-gray-700">
                    Doctor:
                  </label>
                  <select
                    id="doctor-filter"
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      setCalendarKey(prev => prev + 1); // Refresh calendar
                    }}
                    className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <GoogleStyleCalendar
              selectedDoctorId={selectedDoctorId || undefined}
              onAvailabilityCreated={() => setCalendarKey(calendarKey + 1)}
              userRole={userRole}
              currentUserId={currentUserId}
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
