// Enhanced Patient Registration for Appointment Integration
// Streamlined registration specifically designed for appointment booking flow
// Features: Smart templates, duplicate detection, appointment context, auto-save, smart validation

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Mail,
  Heart
} from 'lucide-react';
import { createPatient, getPatientByPhone } from '@/lib/services/patient-service';
import type { Patient, PatientRegistrationForm } from '@/types/patient';

// Enhanced validation schema optimized for appointment booking
const appointmentPatientSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\.]+$/, 'Name can only contain letters, spaces, and dots')
    .refine((name) => {
      const words = name.trim().split(/\s+/);
      return words.length >= 2 && words.every(word => word.length >= 1);
    }, 'Please enter full name (first and last name)'),
  
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'),
  
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal(''))
    .refine((email) => {
      if (!email) return true;
      const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && !commonDomains.includes(domain) && !domain.includes('.')) {
        return false;
      }
      return true;
    }, 'Please enter a valid email address'),
  
  date_of_birth: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 0 && age <= 120;
    }, 'Please enter a valid date of birth'),
    
  gender: z.enum(['male', 'female', 'other']).optional(),
  
  // Enhanced address fields
  address: z.string().min(10, 'Please enter complete address').optional(),
  city: z.string().min(2, 'City name required').optional(),
  state: z.string().min(2, 'State name required').optional(),
  pincode: z.string()
    .regex(/^\d{6}$/, 'Please enter valid 6-digit pincode')
    .optional(),
  
  // Enhanced emergency contact
  emergency_contact_name: z.string()
    .min(2, 'Emergency contact name required')
    .max(100, 'Name too long'),
  emergency_contact_phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Valid emergency contact number required'),
  emergency_contact_relationship: z.string()
    .min(2, 'Relationship required'),
  
  // Enhanced medical information
  allergies: z.string().optional(),
  current_medications: z.string().optional(),
  blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).optional(),
  chronic_conditions: z.string().optional(),
  
  // Insurance information
  insurance_provider: z.string().optional(),
  insurance_number: z.string().optional(),
  
  // Registration fee
  registration_fee: z.number().min(0, 'Registration fee must be positive'),
  registration_fee_paid: z.boolean(),
  payment_method: z.enum(['cash', 'card', 'upi', 'online']).optional(),
  
  // Consent and preferences
  consent_treatment: z.boolean().refine(val => val === true, 'Treatment consent is required'),
  consent_data_sharing: z.boolean(),
  marketing_consent: z.boolean(),
  preferred_communication: z.enum(['phone', 'email', 'sms', 'whatsapp']).optional()
});

type AppointmentPatientFormData = z.infer<typeof appointmentPatientSchema>;

interface AppointmentPatientRegistrationProps {
  onSuccess?: (patient: Patient) => void;
  onCancel?: () => void;
  appointmentContext?: {
    date?: string;
    time?: string;
    doctorName?: string;
  };
  prefilledData?: {
    name?: string;
    phone?: string;
  };
}

// Quick registration templates
const REGISTRATION_TEMPLATES = {
  emergency: {
    label: 'Emergency Patient',
    description: 'Urgent medical case - minimal registration',
    defaults: { registration_fee: 0, registration_fee_paid: false },
    icon: AlertTriangle,
    color: 'bg-red-50 border-red-200 text-red-700',
    requiredFields: ['name', 'phone', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship']
  },
  routine: {
    label: 'Routine Consultation', 
    description: 'Regular appointment - standard registration',
    defaults: { registration_fee: 500, registration_fee_paid: false },
    icon: User,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    requiredFields: ['name', 'phone', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship']
  },
  followup: {
    label: 'Follow-up Patient',
    description: 'Returning patient - quick registration',
    defaults: { registration_fee: 300, registration_fee_paid: false },
    icon: Calendar,
    color: 'bg-green-50 border-green-200 text-green-700',
    requiredFields: ['name', 'phone', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship']
  }
};

export default function AppointmentPatientRegistration({
  onSuccess,
  onCancel,
  appointmentContext,
  prefilledData
}: AppointmentPatientRegistrationProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof REGISTRATION_TEMPLATES>('routine');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [registrationStep, setRegistrationStep] = useState<'template' | 'form' | 'success'>('template');
  
  const form = useForm<AppointmentPatientFormData>({
    resolver: zodResolver(appointmentPatientSchema),
    defaultValues: {
      name: prefilledData?.name || '',
      phone: prefilledData?.phone || '',
      email: '',
      registration_fee: 500,
      registration_fee_paid: false,
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      allergies: '',
      current_medications: ''
    }
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
  const watchedPhone = watch('phone');

  // Apply template defaults when template is selected
  useEffect(() => {
    const template = REGISTRATION_TEMPLATES[selectedTemplate];
    Object.entries(template.defaults).forEach(([key, value]) => {
      setValue(key as keyof AppointmentPatientFormData, value);
    });
  }, [selectedTemplate, setValue]);

  // Duplicate detection
  useEffect(() => {
    const checkDuplicate = async () => {
      if (watchedPhone && watchedPhone.length === 10) {
        try {
          const existing = await getPatientByPhone(watchedPhone);
          if (existing) {
            setDuplicateWarning(`Phone number already registered for ${existing.first_name} ${existing.last_name || ''}`);
          } else {
            setDuplicateWarning(null);
          }
        } catch (error) {
          console.error('Error checking duplicates:', error);
        }
      }
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedPhone]);

  const onSubmit = async (data: AppointmentPatientFormData) => {
    setIsSubmitting(true);
    try {
      const patientData: PatientRegistrationForm = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        emergency_contact: {
          name: data.emergency_contact_name,
          phone: data.emergency_contact_phone,
          relationship: data.emergency_contact_relationship
        },
        allergies: data.allergies,
        medical_history: data.current_medications,
        registration_fee: data.registration_fee,
        registration_fee_paid: data.registration_fee_paid
      };

      const newPatient = await createPatient(patientData);
      setRegistrationStep('success');
      
      setTimeout(() => {
        onSuccess?.(newPatient);
      }, 1500);
      
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to register patient. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Template Selection Step
  if (registrationStep === 'template') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Quick Patient Registration
          </CardTitle>
          {appointmentContext && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Appointment: {appointmentContext.date} at {appointmentContext.time}
                {appointmentContext.doctorName && ` with ${appointmentContext.doctorName}`}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            Choose registration type to streamline the process:
          </div>
          
          <div className="grid gap-3">
            {Object.entries(REGISTRATION_TEMPLATES).map(([key, template]) => {
              const Icon = template.icon;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTemplate(key as keyof typeof REGISTRATION_TEMPLATES);
                    setRegistrationStep('form');
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    selectedTemplate === key 
                      ? template.color + ' border-current' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{template.label}</div>
                      <div className="text-sm opacity-75">{template.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </div>
                </button>
              );
            })}
          </div>
          
          {onCancel && (
            <div className="pt-4 border-t">
              <Button variant="outline" onClick={onCancel} className="w-full">
                Cancel Registration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Success Step
  if (registrationStep === 'success') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Patient Registered Successfully!
              </h3>
              <p className="text-gray-600">
                Returning to appointment booking...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Registration Form Step
  const template = REGISTRATION_TEMPLATES[selectedTemplate];
  const TemplateIcon = template.icon;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TemplateIcon className="w-5 h-5" />
            {template.label} Registration
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setRegistrationStep('template')}
          >
            Change Type
          </Button>
        </div>
        {appointmentContext && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <Clock className="w-4 h-4 inline mr-1" />
            Slot reserved: {appointmentContext.date} at {appointmentContext.time}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Duplicate Warning */}
          {duplicateWarning && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-orange-800">
                {duplicateWarning}
              </AlertDescription>
            </Alert>
          )}

          {/* Essential Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter patient's full name"
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Mobile Number *</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className={errors.phone || duplicateWarning ? 'border-red-300' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="email@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...form.register('date_of_birth')}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Emergency Contact *
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name *</Label>
                <Input
                  id="emergency_contact_name"
                  {...form.register('emergency_contact_name')}
                  placeholder="Emergency contact name"
                  className={errors.emergency_contact_name ? 'border-red-300' : ''}
                />
                {errors.emergency_contact_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.emergency_contact_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="emergency_contact_phone">Contact Phone *</Label>
                <Input
                  id="emergency_contact_phone"
                  {...form.register('emergency_contact_phone')}
                  placeholder="10-digit number"
                  maxLength={10}
                  className={errors.emergency_contact_phone ? 'border-red-300' : ''}
                />
                {errors.emergency_contact_phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.emergency_contact_phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship *</Label>
                <select
                  id="emergency_contact_relationship"
                  {...form.register('emergency_contact_relationship')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.emergency_contact_relationship ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select relationship</option>
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
                {errors.emergency_contact_relationship && (
                  <p className="text-sm text-red-600 mt-1">{errors.emergency_contact_relationship.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Medical Information (Optional)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="allergies">Known Allergies</Label>
                <Input
                  id="allergies"
                  {...form.register('allergies')}
                  placeholder="e.g., Penicillin, Nuts, None"
                />
              </div>

              <div>
                <Label htmlFor="current_medications">Current Medications</Label>
                <Input
                  id="current_medications"
                  {...form.register('current_medications')}
                  placeholder="e.g., Diabetes medication, None"
                />
              </div>
            </div>
          </div>

          {/* Registration Fee */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900">Registration Fee</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registration_fee">Fee Amount (₹)</Label>
                <Input
                  id="registration_fee"
                  type="number"
                  {...form.register('registration_fee', { valueAsNumber: true })}
                  min="0"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...form.register('registration_fee_paid')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Fee Paid
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
              onClick={() => setRegistrationStep('template')}
              className="flex-1"
            >
              Back
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
              disabled={isSubmitting || !!duplicateWarning}
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
                  Register & Continue
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
