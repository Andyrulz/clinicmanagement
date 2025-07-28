'use client';

import React, { useState } from 'react';
import { createPatient, getPatientByPhone } from '@/lib/services/patient-service';
import { GENDER_OPTIONS, type Patient } from '@/types/patient';

interface PatientRegistrationProps {
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  medical_history: string;
  allergies: string;
  registration_fee: number;
  registration_fee_paid: boolean;
  // Address
  street: string;
  city: string;
  state: string;
  postal_code: string;
  // Emergency contact
  emergency_name: string;
  emergency_relationship: string;
  emergency_phone: string;
}

export default function PatientRegistration({ onSuccess, onCancel }: PatientRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    medical_history: '',
    allergies: '',
    registration_fee: 0,
    registration_fee_paid: false,
    street: '',
    city: '',
    state: '',
    postal_code: '',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

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

  const handlePhoneBlur = async () => {
    if (formData.phone) {
      await checkPhoneExists(formData.phone);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPhoneError(null);

    try {
      // Validation
      if (!formData.name || !formData.phone) {
        throw new Error('Name and phone number are required');
      }

      // Final phone check before submission
      const phoneAvailable = await checkPhoneExists(formData.phone);
      if (!phoneAvailable) {
        setIsSubmitting(false);
        return;
      }

      // Prepare patient data
      const patientData = {
        name: formData.name,
        phone: formData.phone.replace(/\s+/g, ''),
        email: formData.email || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender as 'male' | 'female' | 'other' || undefined,
        address: formData.street || formData.city || formData.state || formData.postal_code ? {
          street: formData.street || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          postal_code: formData.postal_code || undefined,
        } : undefined,
        emergency_contact: formData.emergency_name || formData.emergency_phone ? {
          name: formData.emergency_name || undefined,
          relationship: formData.emergency_relationship || undefined,
          phone: formData.emergency_phone || undefined,
        } : undefined,
        medical_history: formData.medical_history || undefined,
        allergies: formData.allergies || undefined,
        registration_fee: formData.registration_fee,
        registration_fee_paid: formData.registration_fee_paid,
      };

      const patient = await createPatient(patientData);
      
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

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b-2 border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">New Patient Registration</h2>
        <p className="text-sm text-gray-700 font-medium mt-1">
          Register a new patient in the system
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter patient's full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                onBlur={handlePhoneBlur}
                required
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter phone number"
              />
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
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter email address (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              />
              {formData.date_of_birth && (
                <p className="text-sm text-gray-700 font-medium mt-1">
                  Age: {calculateAge(formData.date_of_birth)} years
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-gray-900 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                name="street"
                value={formData.street}
                onChange={handleInputChange}
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
                name="city"
                value={formData.city}
                onChange={handleInputChange}
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
                name="state"
                value={formData.state}
                onChange={handleInputChange}
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
                name="postal_code"
                value={formData.postal_code}
                onChange={handleInputChange}
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
                name="emergency_name"
                value={formData.emergency_name}
                onChange={handleInputChange}
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
                name="emergency_relationship"
                value={formData.emergency_relationship}
                onChange={handleInputChange}
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
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleInputChange}
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
                name="medical_history"
                value={formData.medical_history}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
                placeholder="Enter past medical conditions, surgeries, chronic illnesses..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Known Allergies
              </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white resize-none"
                placeholder="Enter known allergies to medications, foods, etc..."
              />
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
                name="registration_fee"
                value={formData.registration_fee}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
                className="w-full px-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                placeholder="Enter registration fee"
              />
            </div>

            <div className="flex items-center pt-8">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="registration_fee_paid"
                  checked={formData.registration_fee_paid}
                  onChange={handleInputChange}
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
