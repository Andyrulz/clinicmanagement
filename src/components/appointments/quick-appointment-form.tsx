// Quick Appointment Form Component
// Component for creating appointments from the calendar view
// Integrates with existing patient service and new appointment service
// Date: August 2, 2025

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, User, Users, FileText, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { appointmentService } from '@/lib/services/appointment-service';
import { searchPatients } from '@/lib/services/patient-service';
import { createClient } from '@/lib/supabase/client';
import AppointmentPatientRegistration from '@/components/patients/appointment-patient-registration';
import type { CreateAppointmentRequest, AppointmentWithDetails } from '@/types/appointment';
import type { Patient } from '@/types/patient';

interface Doctor {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  specialization?: string;
}

interface QuickAppointmentFormProps {
  selectedDoctor?: Doctor;
  selectedDate?: string;
  selectedTime?: string;
  onAppointmentCreated?: (appointment: AppointmentWithDetails) => void;
  onCancel?: () => void;
  className?: string;
}

export function QuickAppointmentForm({
  selectedDoctor,
  selectedDate,
  selectedTime,
  onAppointmentCreated,
  onCancel,
  className = ''
}: QuickAppointmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [formData, setFormData] = useState<CreateAppointmentRequest>({
    patient_id: '',
    doctor_id: selectedDoctor?.id || '',
    appointment_date: selectedDate || new Date().toISOString().split('T')[0],
    appointment_time: selectedTime || '09:00',
    duration_minutes: 30,
    chief_complaint: '',
    appointment_type: 'consultation',
    appointment_source: 'manual',
    priority: 'normal',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Filter patients based on search
  useEffect(() => {
    // Don't show dropdown if a patient is already selected
    if (formData.patient_id) {
      setShowPatientDropdown(false);
      return;
    }

    if (patientSearch.trim()) {
      const filtered = patients.filter(patient => {
        const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
        const searchLower = patientSearch.toLowerCase();
        return fullName.includes(searchLower) ||
               (patient.uhid && patient.uhid.toLowerCase().includes(searchLower)) ||
               (patient.phone && patient.phone.includes(patientSearch));
      });
      setFilteredPatients(filtered);
      setShowPatientDropdown(true);
    } else {
      setFilteredPatients([]);
      setShowPatientDropdown(false);
    }
  }, [patientSearch, patients, formData.patient_id]);

  const loadDoctors = useCallback(async () => {
    try {
      setLoadingDoctors(true);
      console.log('Loading doctors for appointment form...');
      
      // Load real doctors from the existing system
      const supabase = createClient();
      
      // Get current user's tenant_id
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth error details:', authError);
        console.error('Auth error message:', authError.message);
        return;
      }
      
      if (!user) {
        console.error('No user found in session');
        return;
      }

      console.log('User authenticated, getting profile for user ID:', user.id);

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error details:', profileError);
        console.error('Profile error message:', profileError.message);
        console.error('Profile error code:', profileError.code);
        return;
      }
      
      if (!profile) {
        console.error('No profile found for user');
        return;
      }

      console.log('Found profile with tenant_id:', profile.tenant_id);

      // Load all active doctors in the tenant (removing specialization field that may not exist)
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('users')
        .select('id, full_name, role, email')
        .eq('tenant_id', profile.tenant_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('full_name');

      if (doctorsError) {
        console.error('Doctors query error details:', doctorsError);
        console.error('Doctors query error message:', doctorsError.message);
        console.error('Doctors query error code:', doctorsError.code);
        return;
      }

      console.log('Loaded doctors for appointment form:', doctorsData);
      console.log('Number of doctors found:', doctorsData?.length || 0);
      setDoctors(doctorsData || []);
      
      // Auto-select the selectedDoctor prop if provided
      if (selectedDoctor && doctorsData) {
        const foundDoctor = doctorsData.find(d => d.id === selectedDoctor.id);
        if (foundDoctor) {
          console.log('Auto-selecting provided doctor:', selectedDoctor.full_name);
          setFormData(prev => ({ ...prev, doctor_id: selectedDoctor.id }));
        } else {
          console.log('Provided doctor not found in loaded doctors list');
        }
      }
    } catch (error) {
      console.error('Unexpected error in loadDoctors:');
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      console.error('Full error object:', error);
    } finally {
      setLoadingDoctors(false);
    }
  }, [selectedDoctor]);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      // Use the real patient service
      const result = await searchPatients({ limit: 100 });
      setPatients(result.patients || []);
    } catch (error) {
      console.error('Failed to load patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadDoctors();
    loadPatients();
  }, [loadDoctors, loadPatients]);

  const handlePatientSelect = (patient: Patient) => {
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
    setPatientSearch(`${fullName} (${patient.uhid || patient.id})`);
    setShowPatientDropdown(false);
    if (errors.patient_id) {
      setErrors(prev => ({ ...prev, patient_id: '' }));
    }
  };

  const handlePatientCreated = (newPatient: Patient) => {
    // Add the new patient to the patients list
    setPatients(prev => [newPatient, ...prev]);
    
    // Auto-select the new patient and clear the search to hide dropdown
    handlePatientSelect(newPatient);
    
    // Close the add patient form
    setShowAddPatient(false);
    
    // Clear any search state to ensure dropdown disappears
    setShowPatientDropdown(false);
    
    console.log('New patient created and selected:', newPatient);
  };

  const handleAddPatientCancel = () => {
    setShowAddPatient(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.patient_id) {
      newErrors.patient_id = 'Please select a patient';
    }

    if (!formData.doctor_id) {
      newErrors.doctor_id = 'Please select a doctor';
    }

    if (!formData.appointment_date) {
      newErrors.appointment_date = 'Please select a date';
    }

    if (!formData.appointment_time) {
      newErrors.appointment_time = 'Please select a time';
    }

    if (!formData.chief_complaint?.trim()) {
      newErrors.chief_complaint = 'Please enter the reason for visit';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      console.log('🔄 Creating appointment with data:', formData);
      
      const response = await appointmentService.createAppointment(formData);

      if (response.success && response.data) {
        setSuccessMessage('Appointment created successfully!');
        
        // Convert Appointment to AppointmentWithDetails for the callback
        const selectedPatient = patients.find(p => p.id === formData.patient_id);
        const selectedDoctorData = doctors.find(d => d.id === formData.doctor_id);
        const appointmentWithDetails: AppointmentWithDetails = {
          ...response.data,
          patient: {
            id: selectedPatient!.id,
            first_name: selectedPatient!.first_name || '',
            last_name: selectedPatient!.last_name || '',
            uhid: selectedPatient!.uhid || '',
            phone: selectedPatient!.phone || '',
            email: selectedPatient!.email,
            age: selectedPatient!.age,
            gender: selectedPatient!.gender
          },
          doctor: {
            id: selectedDoctorData!.id,
            full_name: selectedDoctorData!.full_name,
            email: selectedDoctorData!.email || '',
            role: selectedDoctorData!.role,
            specialization: selectedDoctorData!.specialization
          },
          visit: response.data.visit_id ? {
            id: response.data.visit_id,
            visit_number: `V-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-001`,
            status: 'scheduled'
          } : undefined
        };

        onAppointmentCreated?.(appointmentWithDetails);

        // Reset form
        setFormData(prev => ({
          ...prev,
          patient_id: '',
          chief_complaint: '',
          notes: ''
        }));
        setPatientSearch('');
      } else {
        setErrors({ general: response.error || 'Failed to create appointment' });
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">
            Quick Appointment
          </h3>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <span className="text-red-700">{errors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4 inline mr-1" />
            Patient *
            {formData.patient_id && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Selected
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => {
                const newValue = e.target.value;
                setPatientSearch(newValue);
                
                // Clear selected patient if user starts typing new search
                if (formData.patient_id && newValue !== patientSearch) {
                  setFormData(prev => ({ ...prev, patient_id: '' }));
                }
              }}
              placeholder={formData.patient_id ? "Patient selected - click × to change" : "Search patient by name, UHID, or phone..."}
              className={`w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.patient_id ? 'border-red-300' : 
                formData.patient_id ? 'border-green-300 bg-green-50' : 'border-gray-300'
              }`}
              required
            />
            {formData.patient_id && (
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, patient_id: '' }));
                  setPatientSearch('');
                  setShowPatientDropdown(false);
                }}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          {errors.patient_id && (
            <p className="text-red-600 text-sm mt-1">{errors.patient_id}</p>
          )}
          
          {/* Patient Dropdown */}
          {showPatientDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handlePatientSelect(patient)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">
                      {patient.first_name || ''} {patient.last_name || ''}
                    </div>
                    <div className="text-sm text-gray-500">
                      {patient.uhid || patient.id} • {patient.phone || 'No phone'}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3">
                  <div className="text-gray-500 text-sm mb-2">No patients found</div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPatient(true);
                      setShowPatientDropdown(false);
                    }}
                    className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Patient
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Doctor Selection */}
        {selectedDoctor ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Doctor *
            </label>
            <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-blue-900">Dr. {selectedDoctor.full_name}</div>
                <div className="text-sm text-blue-600">Pre-selected from calendar</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Doctor * {loadingDoctors ? (
                <span className="ml-2 text-xs text-blue-600">Loading...</span>
              ) : doctors.length > 0 ? (
                <span className="ml-2 text-xs text-green-600">({doctors.length} doctors loaded)</span>
              ) : (
                <span className="ml-2 text-xs text-red-600">(No doctors found)</span>
              )}
            </label>
            <select
              value={formData.doctor_id}
              onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.doctor_id ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            >
              <option value="">
                {loadingDoctors ? 'Loading doctors...' : doctors.length === 0 ? 'No doctors available' : 'Select Doctor'}
              </option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name}
                </option>
              ))}
            </select>
            {errors.doctor_id && (
              <p className="text-red-600 text-sm mt-1">{errors.doctor_id}</p>
            )}
          </div>
        )}

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.appointment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.appointment_date ? 'border-red-300' : 'border-gray-300'
              }`}
              required
              disabled={!!selectedDate}
            />
            {errors.appointment_date && (
              <p className="text-red-600 text-sm mt-1">{errors.appointment_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-4 h-4 inline mr-1" />
              Time *
            </label>
            <input
              type="time"
              value={formData.appointment_time}
              onChange={(e) => setFormData(prev => ({ ...prev, appointment_time: e.target.value }))}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.appointment_time ? 'border-red-300' : 'border-gray-300'
              }`}
              required
              disabled={!!selectedTime}
            />
            {errors.appointment_time && (
              <p className="text-red-600 text-sm mt-1">{errors.appointment_time}</p>
            )}
          </div>
        </div>

        {/* Duration and Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <select
              value={formData.duration_minutes}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.appointment_type}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                appointment_type: e.target.value as 'consultation' | 'follow_up' | 'emergency' | 'procedure'
              }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="consultation">Consultation</option>
              <option value="follow_up">Follow Up</option>
              <option value="emergency">Emergency</option>
              <option value="procedure">Procedure</option>
            </select>
          </div>
        </div>

        {/* Chief Complaint */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FileText className="w-4 h-4 inline mr-1" />
            Reason for Visit *
          </label>
          <textarea
            value={formData.chief_complaint}
            onChange={(e) => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
            placeholder="Enter the main reason for this appointment..."
            rows={2}
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.chief_complaint ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          />
          {errors.chief_complaint && (
            <p className="text-red-600 text-sm mt-1">{errors.chief_complaint}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional instructions or notes..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !formData.patient_id || !formData.doctor_id}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Create Appointment
              </>
            )}
          </button>
        </div>
      </form>

      {/* Add Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Add New Patient
                </h2>
                <div className="text-sm text-gray-600">
                  Time slot reserved: {formData.appointment_date} at {formData.appointment_time}
                </div>
              </div>
            </div>
            <div className="p-4">
              <AppointmentPatientRegistration
                onSuccess={handlePatientCreated}
                onCancel={handleAddPatientCancel}
                appointmentContext={{
                  date: formData.appointment_date,
                  time: formData.appointment_time,
                  doctorName: doctors.find(d => d.id === formData.doctor_id)?.full_name
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
