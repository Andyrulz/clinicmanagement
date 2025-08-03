'use client';

import { useState } from 'react';
import DoctorAvailabilityForm from './doctor-availability-form';
import DoctorAvailabilityCalendar from './doctor-availability-calendar';
import type { DoctorTimeSlot } from '@/types/doctor-availability';

interface AvailabilityDashboardProps {
  doctorId?: string;
  userRole?: string;
}

export default function AvailabilityDashboard({ 
  doctorId, 
  userRole = 'staff' 
}: AvailabilityDashboardProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'calendar' | 'manage'>('form');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedSlot, setSelectedSlot] = useState<DoctorTimeSlot | null>(null);
  const [showSlotDetails, setShowSlotDetails] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0); // Force calendar refresh

  const handleSlotClick = (slot: DoctorTimeSlot) => {
    setSelectedSlot(slot);
    setShowSlotDetails(true);
  };

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
            doctorId={doctorId}
            userRole={userRole}
            onSuccess={handleFormSuccess}
            onCancel={() => setActiveTab('calendar')}
          />
        );
      
      case 'calendar':
        return (
          <div className="space-y-4">
            {/* View Mode Selector */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Doctor Availability Calendar</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'daily' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'weekly' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'monthly' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            
            <DoctorAvailabilityCalendar
              key={calendarKey} // Force refresh when key changes
              doctorId={doctorId}
              viewMode={viewMode}
              onSlotClick={handleSlotClick}
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

      {/* Slot Details Modal */}
      {showSlotDetails && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Time Slot Details</h3>
              <button
                onClick={() => setShowSlotDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <p className="text-gray-900">{selectedSlot.slot_date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <p className="text-gray-900">
                  {selectedSlot.start_time} - {selectedSlot.end_time}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className={`font-medium ${
                  selectedSlot.is_available 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {selectedSlot.is_available ? 'Available' : 'Booked'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Capacity</label>
                <p className="text-gray-900">
                  {selectedSlot.current_bookings} / {selectedSlot.max_bookings}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSlotDetails(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
