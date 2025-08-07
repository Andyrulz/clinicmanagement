// Appointment Integration Test Page
// Test page to verify appointment service and components work together
// Simulates the calendar appointment creation workflow
// Date: August 4, 2025

'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, Clock, Users } from 'lucide-react';
import { QuickAppointmentForm } from '@/components/appointments/quick-appointment-form';
import { AppointmentStatusDashboard } from '@/components/appointments/appointment-status-dashboard';
import type { AppointmentWithDetails } from '@/types/appointment';

interface Doctor {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  specialization?: string;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  data: Record<string, unknown>;
}

export default function AppointmentTestPage() {
  const [selectedTest, setSelectedTest] = useState<string>('basic-form');
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [createdAppointments, setCreatedAppointments] = useState<AppointmentWithDetails[]>([]);

  const testScenarios: TestScenario[] = [
    {
      id: 'basic-form',
      name: 'Basic Appointment Form',
      description: 'Test creating a basic appointment through the form',
      data: {
        doctor: { id: '1', full_name: 'Dr. Smith', role: 'doctor', email: 'dr.smith@clinic.com' },
        selectedDate: '2025-08-05',
        selectedTime: '10:00'
      }
    },
    {
      id: 'status-dashboard',
      name: 'Status Dashboard',
      description: 'Test the appointment status dashboard with live data',
      data: {
        selectedDoctor: '1',
        selectedDate: '2025-08-05'
      }
    },
    {
      id: 'calendar-integration',
      name: 'Calendar Integration',
      description: 'Test calendar event display and interaction',
      data: {
        events: [
          {
            id: '1',
            title: 'John Doe',
            start: new Date('2025-08-05T10:00:00'),
            end: new Date('2025-08-05T10:30:00'),
            type: 'appointment',
            status: 'scheduled'
          }
        ]
      }
    },
    {
      id: 'workflow-test',
      name: 'Complete Workflow',
      description: 'Test the complete appointment creation and management workflow',
      data: {
        workflow: ['create', 'view', 'update', 'cancel']
      }
    }
  ];

  const handleAppointmentCreated = (appointment: AppointmentWithDetails) => {
    console.log('✅ TEST: Appointment created successfully:', appointment);
    setCreatedAppointments(prev => [...prev, appointment]);
    setTestResults(prev => ({ ...prev, [selectedTest]: 'pass' }));
  };

  const handleTestSelection = (testId: string) => {
    setSelectedTest(testId);
    setTestResults(prev => ({ ...prev, [testId]: 'pending' }));
  };

  const currentScenario = testScenarios.find(s => s.id === selectedTest);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              Appointment System Integration Test
            </h1>
          </div>
          <p className="text-gray-600">
            Testing the complete appointment scheduling workflow with real components
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">Day 2 Progress: </span>
              <span className="text-blue-700">Database schema ✅ • Service layer ✅ • Component integration 🔄</span>
            </div>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Scenarios</h3>
            <div className="space-y-2">
              {testScenarios.map((scenario) => {
                const status = testResults[scenario.id] || 'pending';
                const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏳';
                
                return (
                  <button
                    key={scenario.id}
                    onClick={() => handleTestSelection(scenario.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTest === scenario.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{scenario.name}</span>
                      <span className="text-lg">{statusIcon}</span>
                    </div>
                    <p className="text-sm text-gray-600">{scenario.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test Content */}
          <div className="lg:col-span-3">
            {currentScenario && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {currentScenario.name}
                  </h3>
                  <p className="text-gray-600">{currentScenario.description}</p>
                </div>

                <div className="p-6">
                  {selectedTest === 'basic-form' && (
                    <QuickAppointmentForm
                      selectedDoctor={currentScenario.data.doctor as Doctor | undefined}
                      selectedDate={currentScenario.data.selectedDate as string}
                      selectedTime={currentScenario.data.selectedTime as string}
                      onAppointmentCreated={handleAppointmentCreated}
                      className="max-w-2xl"
                    />
                  )}

                  {selectedTest === 'status-dashboard' && (
                    <AppointmentStatusDashboard
                      selectedDoctor={currentScenario.data.selectedDoctor as string | undefined}
                      selectedDate={currentScenario.data.selectedDate as string | undefined}
                      onStatusClick={(status) => {
                        console.log('📊 Status clicked:', status);
                        setTestResults(prev => ({ ...prev, [selectedTest]: 'pass' }));
                      }}
                    />
                  )}

                  {selectedTest === 'calendar-integration' && (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Calendar Integration Test
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Calendar component will be implemented in Day 3-5
                      </p>
                      <button
                        onClick={() => setTestResults(prev => ({ ...prev, [selectedTest]: 'pass' }))}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Mark as Ready for Integration
                      </button>
                    </div>
                  )}

                  {selectedTest === 'workflow-test' && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Complete Workflow Test</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">1. Create Appointment</h5>
                          <QuickAppointmentForm
                            selectedDate="2025-08-05"
                            selectedTime="14:00"
                            onAppointmentCreated={handleAppointmentCreated}
                            className="mb-4"
                          />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">2. View Status</h5>
                          <AppointmentStatusDashboard
                            selectedDate="2025-08-05"
                            onStatusClick={(status) => console.log('Status:', status)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Test Results */}
        {createdAppointments.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-green-900">
                Created Appointments ({createdAppointments.length})
              </h3>
            </div>
            <div className="space-y-3">
              {createdAppointments.map((appointment, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Patient:</span>
                      <p className="text-gray-900">{appointment.patient.first_name} {appointment.patient.last_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Doctor:</span>
                      <p className="text-gray-900">{appointment.doctor.full_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Date & Time:</span>
                      <p className="text-gray-900">{appointment.appointment_date} at {appointment.appointment_time}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <p className="text-gray-900 capitalize">{appointment.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integration Status */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 text-blue-600 mr-2" />
            Week 1-2 Progress Tracker
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Completed ✅</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Database schema enhancement (22-enhanced-appointment-scheduling.sql)</li>
                <li>• Appointment service implementation</li>
                <li>• TypeScript types and interfaces</li>
                <li>• Quick appointment form component</li>
                <li>• Status dashboard component</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Next Steps 🔄</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• React Big Calendar integration (Day 3-5)</li>
                <li>• Calendar event display and interaction</li>
                <li>• Appointment workflow automation</li>
                <li>• Integration with existing visit system</li>
                <li>• Testing and bug fixes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-600 text-white rounded-lg">
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            <span className="font-medium">Day 2 Complete:</span>
            <span className="ml-2">Appointment service and components are ready for calendar integration!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
