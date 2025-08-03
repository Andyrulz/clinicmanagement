'use client';

import React, { useState, useEffect } from 'react';
import { doctorAvailabilityService } from '@/lib/services/doctor-availability';
import { createClient } from '@/lib/supabase/client';
import { DAY_NAMES, AVAILABILITY_TYPES } from '@/types/doctor-availability';

interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
}

interface AvailabilityFormData {
  doctor_id: string;
  day_of_week: number;
  time_blocks: TimeBlock[];
  availability_type: 'regular' | 'special' | 'break' | 'unavailable';
  effective_from: string;
  effective_until: string;
  notes: string;
}

interface DoctorAvailabilityFormProps {
  doctorId?: string;
  userRole?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DoctorAvailabilityForm({ 
  doctorId, 
  userRole = 'staff',
  onSuccess, 
  onCancel 
}: DoctorAvailabilityFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedDoctorName, setSelectedDoctorName] = useState('');
  const [formData, setFormData] = useState<AvailabilityFormData>({
    doctor_id: doctorId || '',
    day_of_week: 1, // Monday
    time_blocks: [
      { id: '1', start_time: '09:00', end_time: '12:00' }
    ],
    availability_type: 'regular',
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();
  const canSelectDoctor = userRole === 'admin' || userRole === 'manager';

  // Debug message state changes
  useEffect(() => {
    console.log('🎯 MESSAGE STATE CHANGED:', message);
  }, [message]);

  // Load doctors for admin/manager users
  useEffect(() => {
    const loadDoctors = async () => {
      if (!canSelectDoctor) return;

      try {
        console.log('Loading doctors...');
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

        console.log('Loaded doctors:', doctorsList);
        setDoctors(doctorsList || []);
      } catch (error) {
        console.error('Error loading doctors:', error);
      }
    };

    loadDoctors();
  }, [canSelectDoctor, supabase]);

  // Load current doctor's name if doctorId is provided
  useEffect(() => {
    const loadDoctorName = async () => {
      if (!doctorId) return;

      try {
        const { data: doctor, error } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', doctorId)
          .single();

        if (error) {
          console.error('Error loading doctor name:', error);
          return;
        }

        setSelectedDoctorName(doctor?.full_name || '');
      } catch (error) {
        console.error('Error loading doctor name:', error);
      }
    };

    loadDoctorName();
  }, [doctorId, supabase]);

  const validateTimeBlock = (block: TimeBlock): string | null => {
    if (!block.start_time) return 'Start time is required';
    if (!block.end_time) return 'End time is required';
    if (block.start_time >= block.end_time) return 'End time must be after start time';
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.doctor_id) {
      newErrors.doctor_id = 'Doctor is required';
    }

    if (formData.time_blocks.length === 0) {
      newErrors.time_blocks = 'At least one time block is required';
    }

    // Validate each time block
    formData.time_blocks.forEach((block, index) => {
      const blockError = validateTimeBlock(block);
      if (blockError) {
        newErrors[`time_block_${index}`] = blockError;
      }
    });

    // Check for overlapping time blocks
    for (let i = 0; i < formData.time_blocks.length; i++) {
      for (let j = i + 1; j < formData.time_blocks.length; j++) {
        const block1 = formData.time_blocks[i];
        const block2 = formData.time_blocks[j];
        
        if (
          (block1.start_time < block2.end_time && block1.end_time > block2.start_time)
        ) {
          newErrors.overlapping = 'Time blocks cannot overlap';
          break;
        }
      }
    }

    if (!formData.effective_from) {
      newErrors.effective_from = 'Effective from date is required';
    }

    if (formData.effective_until && formData.effective_from && formData.effective_until <= formData.effective_from) {
      newErrors.effective_until = 'Effective until date must be after effective from date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Create availability records for each time block
      const promises = formData.time_blocks.map(async (block) => {
        const request = {
          doctor_id: formData.doctor_id,
          day_of_week: formData.day_of_week,
          start_time: block.start_time,
          end_time: block.end_time,
          slot_duration_minutes: 30, // Default values - these won't be used for scheduling
          buffer_time_minutes: 0,
          max_patients_per_slot: 1,
          availability_type: formData.availability_type,
          effective_from: formData.effective_from,
          effective_until: formData.effective_until || undefined,
          notes: formData.notes || undefined
        };

        console.log('Creating availability with request:', request);
        return doctorAvailabilityService.createAvailability(request);
      });

      console.log('Starting availability creation...');
      const results = await Promise.all(promises);
      console.log('All promises resolved. Results:', results);
      
      const failedResults = results.filter(result => !result.success);
      console.log('Failed results:', failedResults);
      console.log('Successful results:', results.filter(result => result.success));

      if (failedResults.length > 0) {
        // Log detailed errors for debugging
        console.error('Availability creation failed:', failedResults);
        const errorMessages = failedResults
          .map(result => result.error)
          .filter(Boolean)
          .join(', ');
        
        setMessage({ 
          type: 'error', 
          text: `Failed to create ${failedResults.length} availability block(s). ${errorMessages ? `Errors: ${errorMessages}` : ''}` 
        });
      } else {
        console.log('All availability blocks created successfully');
        const successMessage = `✅ Successfully created ${results.length} availability block(s) for ${DAY_NAMES[formData.day_of_week]}`;
        console.log('Setting success message:', successMessage);
        setMessage({ 
          type: 'success', 
          text: successMessage
        });
        console.log('Success message set, current message state should update');
        
        // Clear success message after 5 seconds (longer time to see it)
        setTimeout(() => {
          console.log('🧹 Clearing success message after 5 seconds');
          setMessage(null);
        }, 5000);
        
        // Clear the form after a delay so user can see the success message
        setTimeout(() => {
          setFormData({
            doctor_id: doctorId || '',
            day_of_week: 1,
            time_blocks: [{ id: '1', start_time: '09:00', end_time: '12:00' }],
            availability_type: 'regular',
            effective_from: new Date().toISOString().split('T')[0],
            effective_until: '',
            notes: ''
          });
        }, 1000); // Wait 1 second before clearing form
        
        onSuccess?.();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTimeBlock = () => {
    const newBlock: TimeBlock = {
      id: Date.now().toString(),
      start_time: '09:00',
      end_time: '12:00'
    };
    
    setFormData(prev => ({
      ...prev,
      time_blocks: [...prev.time_blocks, newBlock]
    }));
  };

  const removeTimeBlock = (blockId: string) => {
    setFormData(prev => ({
      ...prev,
      time_blocks: prev.time_blocks.filter(block => block.id !== blockId)
    }));
  };

  const updateTimeBlock = (blockId: string, field: 'start_time' | 'end_time', value: string) => {
    setFormData(prev => ({
      ...prev,
      time_blocks: prev.time_blocks.map(block =>
        block.id === blockId ? { ...block, [field]: value } : block
      )
    }));
    
    // Clear errors for this block
    const blockIndex = formData.time_blocks.findIndex(block => block.id === blockId);
    if (errors[`time_block_${blockIndex}`]) {
      setErrors(prev => ({
        ...prev,
        [`time_block_${blockIndex}`]: ''
      }));
    }
  };

  const handleInputChange = (field: keyof AvailabilityFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Doctor Availability</h2>
        <p className="text-gray-600 mt-1">Set available time blocks for the selected day</p>
        
        {/* Help text for better UX */}
        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">📋 How this works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Day of Week:</strong> Choose which day (Monday, Tuesday, etc.) this schedule applies to</li>
            <li>• <strong>Time Blocks:</strong> Add multiple time slots for that day (e.g., 9AM-12PM, 2PM-5PM)</li>
            <li>• <strong>Effective From:</strong> When this schedule starts (today by default)</li>
            <li>• <strong>Effective Until:</strong> When it ends (optional - leave blank for ongoing)</li>
          </ul>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Doctor Selection */}
        <div className="space-y-2">
          <label htmlFor="doctor_selection" className="block text-sm font-medium text-gray-700">
            Doctor
          </label>
          {canSelectDoctor ? (
            <select
              id="doctor_selection"
              value={formData.doctor_id}
              onChange={(e) => {
                handleInputChange('doctor_id', e.target.value);
                const selectedDoctor = doctors.find(d => d.id === e.target.value);
                setSelectedDoctorName(selectedDoctor?.full_name || '');
              }}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                errors.doctor_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm border p-2 text-gray-600">
              {selectedDoctorName || 'Loading doctor name...'}
            </div>
          )}
          {errors.doctor_id && (
            <p className="text-sm text-red-600">{errors.doctor_id}</p>
          )}
        </div>

        {/* Day of Week */}
        <div className="space-y-2">
          <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">
            Day of Week
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Select which day of the week this availability pattern applies to (will repeat weekly)
          </p>
          <select
            id="day_of_week"
            value={formData.day_of_week}
            onChange={(e) => handleInputChange('day_of_week', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          >
            {DAY_NAMES.map((day, index) => (
              <option key={index} value={index}>
                {day}
              </option>
            ))}
          </select>
          {errors.day_of_week && (
            <p className="text-sm text-red-600">{errors.day_of_week}</p>
          )}
        </div>

        {/* Time Blocks */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">
                🕐 Available Time Blocks
              </label>
              <button
                type="button"
                onClick={addTimeBlock}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                + Add Time Block
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add multiple time slots for the day (e.g., morning 9AM-12PM, afternoon 2PM-5PM)
            </p>
          </div>
          
          {errors.time_blocks && (
            <p className="text-sm text-red-600">{errors.time_blocks}</p>
          )}
          
          {errors.overlapping && (
            <p className="text-sm text-red-600">{errors.overlapping}</p>
          )}

          <div className="space-y-3">
            {formData.time_blocks.map((block) => (
              <div key={block.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={block.start_time}
                      onChange={(e) => updateTimeBlock(block.id, 'start_time', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={block.end_time}
                      onChange={(e) => updateTimeBlock(block.id, 'end_time', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                    />
                  </div>
                </div>
                
                {formData.time_blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTimeBlock(block.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove time block"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Availability Type */}
        <div className="space-y-2">
          <label htmlFor="availability_type" className="block text-sm font-medium text-gray-700">
            Availability Type
          </label>
          <select
            id="availability_type"
            value={formData.availability_type}
            onChange={(e) => handleInputChange('availability_type', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          >
            {AVAILABILITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">📅 Schedule Duration</h3>
            <p className="text-xs text-gray-500 mb-3">
              Set when this weekly schedule starts and ends. The schedule will repeat every week between these dates.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="effective_from" className="block text-sm font-medium text-gray-700">
                Start Date <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500">When this schedule begins</p>
              <input
                type="date"
                id="effective_from"
                value={formData.effective_from}
                onChange={(e) => handleInputChange('effective_from', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  errors.effective_from ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.effective_from && (
                <p className="text-sm text-red-600">{errors.effective_from}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="effective_until" className="block text-sm font-medium text-gray-700">
                End Date (Optional)
              </label>
              <p className="text-xs text-gray-500">Leave blank for ongoing schedule</p>
              <input
                type="date"
                id="effective_until"
                value={formData.effective_until}
                onChange={(e) => handleInputChange('effective_until', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  errors.effective_until ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Leave blank for ongoing"
              />
              {errors.effective_until && (
                <p className="text-sm text-red-600">{errors.effective_until}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            placeholder="Any additional notes about this availability..."
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating availability...
              </>
            ) : 'Create Availability Schedule'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
