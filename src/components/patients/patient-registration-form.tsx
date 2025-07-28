'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientRegistrationFormData, patientRegistrationSchema } from '@/lib/validations/patient';
import { createPatient, getPatientByPhone } from '@/lib/services/patient-service';
import { GENDER_OPTIONS, Patient } from '@/types/patient';

interface PatientRegistrationProps {
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
}

export default function PatientRegistration({ onSuccess, onCancel }: PatientRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    clearErrors
  } = useForm<PatientRegistrationFormData>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      registration_fee: 0,
      registration_fee_paid: false
    }
  });

  const watchPhone = watch('phone');

  // Check if phone number already exists
  const checkPhoneExists = async (phone: string) => {
    if (phone && phone.length >= 10) {
      try {
        const existing = await getPatientByPhone(phone);
        if (existing) {
          setPhoneError('A patient with this phone number already exists');
          return false;
        } else {
          setPhoneError(null);
          return true;
        }
      } catch (error) {
        console.error('Error checking phone:', error);
        return true; // Allow submission if check fails
      }
    }
    return true;
  };

  const onSubmit: SubmitHandler<PatientRegistrationFormData> = async (data) => {
    setIsSubmitting(true);
    setPhoneError(null);

    try {
      // Final phone check before submission
      const phoneAvailable = await checkPhoneExists(data.phone);
      if (!phoneAvailable) {
        setIsSubmitting(false);
        return;
      }

      const patient = await createPatient(data);
      
      if (onSuccess) {
        onSuccess(patient);
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      if (error instanceof Error) {
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          setPhoneError('A patient with this phone number already exists');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (watchPhone) {
      await checkPhoneExists(watchPhone);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">New Patient Registration</h2>
        <p className="text-sm text-gray-700 font-medium mt-1">
          Register a new patient in the system
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter patient's full name"
              />
              {errors.name && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                {...register('phone')}
                onBlur={handlePhoneBlur}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.phone.message}</p>
              )}
              {phoneError && (
                <p className="text-sm text-red-900 font-medium mt-1">{phoneError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter email address (optional)"
              />
              {errors.email && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                {...register('date_of_birth')}
                onChange={(e) => {
                  setValue('date_of_birth', e.target.value);
                  clearErrors('date_of_birth');
                }}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              />
              {watch('date_of_birth') && (
                <p className="text-sm text-gray-700 font-medium mt-1">
                  Age: {calculateAge(watch('date_of_birth')!)} years
                </p>
              )}
              {errors.date_of_birth && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.date_of_birth.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Gender
              </label>
              <select
                {...register('gender')}
                className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.gender.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Address Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Street Address
              </label>
              <input
                type="text"
                {...register('address.street')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                City
              </label>
              <input
                type="text"
                {...register('address.city')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                State
              </label>
              <input
                type="text"
                {...register('address.state')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter state"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Postal Code
              </label>
              <input
                type="text"
                {...register('address.postal_code')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Contact Name
              </label>
              <input
                type="text"
                {...register('emergency_contact.name')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter contact name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Relationship
              </label>
              <input
                type="text"
                {...register('emergency_contact.relationship')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="e.g., Father, Spouse"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                {...register('emergency_contact.phone')}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter contact phone"
              />
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Medical Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Medical History
              </label>
              <textarea
                {...register('medical_history')}
                rows={3}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
                placeholder="Enter past medical conditions, surgeries, chronic illnesses..."
              />
              {errors.medical_history && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.medical_history.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Known Allergies
              </label>
              <textarea
                {...register('allergies')}
                rows={2}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
                placeholder="Enter known allergies to medications, foods, etc..."
              />
              {errors.allergies && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.allergies.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Registration Fee */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Registration Fee</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Registration Fee Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('registration_fee', { valueAsNumber: true })}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter registration fee"
              />
              {errors.registration_fee && (
                <p className="text-sm text-red-900 font-medium mt-1">{errors.registration_fee.message}</p>
              )}
            </div>

            <div className="flex items-center pt-8">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  {...register('registration_fee_paid')}
                  className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-900">
                  Registration fee paid
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t-2 border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !!phoneError}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
