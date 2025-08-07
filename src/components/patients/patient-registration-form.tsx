'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PatientRegistrationFormData, patientRegistrationSchema } from '@/lib/validations/patient';
import { createPatient, getPatientByPhone } from '@/lib/services/patient-service';
import { GENDER_OPTIONS, Patient } from '@/types/patient';
import { User, Phone, Mail, Calendar, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PatientRegistrationProps {
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
}

// Smart form templates for different registration scenarios
const REGISTRATION_SCENARIOS = {
  emergency: {
    name: 'Emergency Registration',
    description: 'Minimal info for urgent cases',
    defaults: { registration_fee: 0, registration_fee_paid: false },
    requiredFields: ['name', 'phone', 'emergency_contact'],
    icon: AlertTriangle,
    color: 'bg-red-50 border-red-200'
  },
  routine: {
    name: 'Standard Registration', 
    description: 'Complete patient registration',
    defaults: { registration_fee: 500, registration_fee_paid: false },
    requiredFields: ['name', 'phone', 'emergency_contact', 'date_of_birth'],
    icon: User,
    color: 'bg-blue-50 border-blue-200'
  },
  followup: {
    name: 'Follow-up Patient',
    description: 'Returning patient registration',
    defaults: { registration_fee: 300, registration_fee_paid: false },
    requiredFields: ['name', 'phone'],
    icon: Calendar,
    color: 'bg-green-50 border-green-200'
  }
};

export default function PatientRegistration({ onSuccess, onCancel }: PatientRegistrationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof REGISTRATION_SCENARIOS>('routine');
  const [showScenarioSelection, setShowScenarioSelection] = useState(true);
  const [duplicatePatient, setDuplicatePatient] = useState<Patient | null>(null);

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
      registration_fee: 500,
      registration_fee_paid: false
    }
  });

  const watchPhone = watch('phone');

  // Apply scenario defaults when scenario changes
  useEffect(() => {
    const scenario = REGISTRATION_SCENARIOS[selectedScenario];
    Object.entries(scenario.defaults).forEach(([key, value]) => {
      setValue(key as keyof PatientRegistrationFormData, value);
    });
  }, [selectedScenario, setValue]);

  // Smart duplicate detection with enhanced feedback
  useEffect(() => {
    const checkDuplicateWithDelay = async () => {
      if (watchPhone && watchPhone.length === 10) {
        try {
          const existing = await getPatientByPhone(watchPhone);
          if (existing) {
            setDuplicatePatient(existing);
            setPhoneError(`Patient "${existing.first_name} ${existing.last_name || ''}" already registered with this number`);
          } else {
            setDuplicatePatient(null);
            setPhoneError(null);
          }
        } catch (error) {
          console.error('Error checking duplicates:', error);
          setDuplicatePatient(null);
          setPhoneError(null);
        }
      } else {
        setDuplicatePatient(null);
        setPhoneError(null);
      }
    };

    const timeoutId = setTimeout(checkDuplicateWithDelay, 500);
    return () => clearTimeout(timeoutId);
  }, [watchPhone]);

  // Show scenario selection first
  if (showScenarioSelection) {
    return (
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle>New Patient Registration</CardTitle>
          <p className="text-sm text-gray-700 mt-1">
            Choose registration type to streamline the process
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {Object.entries(REGISTRATION_SCENARIOS).map(([key, scenario]) => {
              const Icon = scenario.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => {
                    setSelectedScenario(key as keyof typeof REGISTRATION_SCENARIOS);
                    setShowScenarioSelection(false);
                  }}
                  className={`p-4 h-auto text-left justify-start hover:shadow-md ${
                    selectedScenario === key 
                      ? scenario.color + ' border-current' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Icon className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{scenario.name}</div>
                      <div className="text-sm text-gray-600 font-normal">{scenario.description}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>

          {onCancel && (
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full"
              >
                Cancel Registration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Updated phone existence check with duplicate patient info
  const checkPhoneExists = async (phone: string) => {
    if (phone && phone.length >= 10) {
      try {
        const existing = await getPatientByPhone(phone);
        if (existing) {
          setDuplicatePatient(existing);
          setPhoneError(`Patient "${existing.first_name} ${existing.last_name || ''}" already registered with this number`);
          return false;
        } else {
          setDuplicatePatient(null);
          setPhoneError(null);
          return true;
        }
      } catch (error) {
        console.error('Error checking phone:', error);
        setDuplicatePatient(null);
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
    <Card className="w-full shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(REGISTRATION_SCENARIOS[selectedScenario].icon, { className: "w-5 h-5" })}
              {REGISTRATION_SCENARIOS[selectedScenario].name}
            </CardTitle>
            <p className="text-sm text-gray-700 font-medium mt-1">
              {REGISTRATION_SCENARIOS[selectedScenario].description}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowScenarioSelection(true)}
          >
            Change Type
          </Button>
        </div>
      </CardHeader>

      {/* Duplicate Patient Alert */}
      {duplicatePatient && (
        <div className="mx-6 mt-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-orange-900">Duplicate Patient Found</h4>
                  <p className="text-sm text-orange-800 mt-1">
                    A patient with phone {duplicatePatient.phone} is already registered:
                  </p>
                </div>
                <div className="p-3 bg-white rounded border border-orange-200">
                  <div className="text-sm">
                    <strong>Name:</strong> {duplicatePatient.first_name} {duplicatePatient.last_name}
                    <br />
                    <strong>UHID:</strong> {duplicatePatient.uhid || 'Not assigned'}
                    <br />
                    <strong>Registration Date:</strong> {duplicatePatient.created_at ? new Date(duplicatePatient.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (onSuccess) {
                        onSuccess(duplicatePatient);
                      }
                    }}
                    className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
                  >
                    Use Existing Patient
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue('phone', '');
                      setDuplicatePatient(null);
                      setPhoneError(null);
                    }}
                  >
                    Enter Different Number
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Smart Input Helper */}
          <Alert className="border-blue-200 bg-blue-50">
            <Lightbulb className="w-4 h-4" />
            <AlertDescription className="text-blue-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Smart Registration</span>
              </div>
              <p className="text-sm mt-1">
                {selectedScenario === 'emergency' && 'Only essential fields are required for emergency cases.'}
                {selectedScenario === 'routine' && 'Complete registration with all patient details.'}
                {selectedScenario === 'followup' && 'Streamlined registration for returning patients.'}
              </p>
            </AlertDescription>
          </Alert>

        {/* Basic Information */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  {...register('name')}
                  placeholder="Enter patient's full name"
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    onBlur={handlePhoneBlur}
                    className={`pl-10 pr-10 ${phoneError ? 'border-red-300' : ''}`}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                  {watchPhone && watchPhone.length === 10 && !phoneError && (
                    <CheckCircle className="w-4 h-4 absolute right-3 top-3 text-green-500" />
                  )}
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                )}
                {phoneError && (
                  <p className="text-sm text-red-600 mt-1">{phoneError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="pl-10"
                    placeholder="email@example.com (optional)"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...register('date_of_birth')}
                    onChange={(e) => {
                      setValue('date_of_birth', e.target.value);
                      clearErrors('date_of_birth');
                    }}
                    className="pl-10"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {watch('date_of_birth') && (
                  <p className="text-sm text-gray-700 mt-1">
                    Age: {calculateAge(watch('date_of_birth')!)} years
                  </p>
                )}
                {errors.date_of_birth && (
                  <p className="text-sm text-red-600 mt-1">{errors.date_of_birth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  {...register('gender')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.gender && (
                  <p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
        <div className="flex gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowScenarioSelection(true)}
            className="flex-1"
          >
            Back to Type Selection
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !!phoneError}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registering...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Register Patient
              </>
            )}
          </Button>
        </div>
        </form>
      </CardContent>
    </Card>
  );
}
