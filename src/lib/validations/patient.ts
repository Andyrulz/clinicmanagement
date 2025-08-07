// Patient Management Validation Schemas
// Zod schemas for form validation and data integrity

import { z } from 'zod';

// Basic validation patterns
const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Address schema
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postal_code: z.string().min(1, 'Postal code is required').max(20),
  country: z.string().default('India')
}).partial();

// Emergency contact schema
const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Emergency contact name is required').max(100),
  relationship: z.string().min(1, 'Relationship is required').max(50),
  phone: z.string().regex(phoneRegex, 'Valid emergency contact number required')
}).partial();

// Patient registration validation
export const patientRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\.]+$/, 'Name can only contain letters, spaces, and dots'),
  
  phone: z.string()
    .regex(phoneRegex, 'Please enter a valid 10-digit mobile number')
    .transform((val) => val.replace(/\s+/g, '')), // Remove spaces
  
  email: z.string()
    .regex(emailRegex, 'Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  date_of_birth: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 0 && age <= 150;
    }, 'Invalid date of birth'),
  
  gender: z.enum(['male', 'female', 'other']).optional(),
  
  address: addressSchema.optional(),
  
  emergency_contact: emergencyContactSchema.optional(),
  
  medical_history: z.string()
    .max(2000, 'Medical history must be less than 2000 characters')
    .optional(),
  
  allergies: z.string()
    .max(1000, 'Allergies must be less than 1000 characters')
    .optional(),
  
  registration_fee: z.number()
    .min(0, 'Registration fee cannot be negative')
    .max(10000, 'Registration fee seems too high'),
  
  registration_fee_paid: z.boolean()
});

// Visit creation validation
export const visitCreationSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  
  doctor_id: z.string().uuid('Invalid doctor ID'),
  
  visit_date: z.string()
    .refine((date) => {
      const visitDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return visitDate >= today;
    }, 'Visit date cannot be in the past'),
  
  visit_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  
  visit_type: z.enum(['new', 'follow-up', 'emergency']),
  
  consultation_fee: z.number()
    .min(0, 'Consultation fee cannot be negative')
    .max(50000, 'Consultation fee seems too high'),
  
  chief_complaint: z.string()
    .max(500, 'Chief complaint must be less than 500 characters')
    .optional(),
  
  visit_notes: z.string()
    .max(1000, 'Visit notes must be less than 1000 characters')
    .optional()
});

// Vitals validation with realistic medical ranges
export const vitalsSchema = z.object({
  height_cm: z.number()
    .min(50, 'Height must be at least 50 cm')
    .max(250, 'Height must be less than 250 cm')
    .optional(),
  
  weight_kg: z.number()
    .min(1, 'Weight must be at least 1 kg')
    .max(300, 'Weight must be less than 300 kg')
    .optional(),
  
  pulse_rate: z.number()
    .int('Pulse rate must be a whole number')
    .min(30, 'Pulse rate seems too low')
    .max(200, 'Pulse rate seems too high')
    .optional(),
  
  bp_systolic: z.number()
    .int('Systolic BP must be a whole number')
    .min(70, 'Systolic BP seems too low')
    .max(250, 'Systolic BP seems too high')
    .optional(),
  
  bp_diastolic: z.number()
    .int('Diastolic BP must be a whole number')
    .min(40, 'Diastolic BP seems too low')
    .max(150, 'Diastolic BP seems too high')
    .optional(),
  
  spo2: z.number()
    .int('SpO2 must be a whole number')
    .min(70, 'SpO2 seems too low')
    .max(100, 'SpO2 cannot exceed 100%')
    .optional(),
  
  temperature: z.number()
    .min(30, 'Temperature seems too low')
    .max(45, 'Temperature seems too high (for Celsius)')
    .optional(),
  
  temperature_unit: z.enum(['C', 'F']).default('C'),
  
  respiratory_rate: z.number()
    .int('Respiratory rate must be a whole number')
    .min(8, 'Respiratory rate seems too low')
    .max(60, 'Respiratory rate seems too high')
    .optional(),
  
  blood_sugar: z.number()
    .min(20, 'Blood sugar seems too low')
    .max(800, 'Blood sugar seems too high')
    .optional(),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
}).refine((data) => {
  // Cross-validation: if temperature is provided, validate against unit
  if (data.temperature && data.temperature_unit === 'F') {
    return data.temperature >= 86 && data.temperature <= 113;
  }
  return true;
}, {
  message: 'Temperature range for Fahrenheit should be 86-113°F',
  path: ['temperature']
}).refine((data) => {
  // Cross-validation: systolic should be higher than diastolic
  if (data.bp_systolic && data.bp_diastolic) {
    return data.bp_systolic > data.bp_diastolic;
  }
  return true;
}, {
  message: 'Systolic pressure should be higher than diastolic pressure',
  path: ['bp_systolic']
});

// Consultation validation
export const consultationSchema = z.object({
  chief_complaint: z.string()
    .max(1000, 'Chief complaint must be less than 1000 characters')
    .optional(),
  
  present_history: z.string()
    .max(2000, 'Present history must be less than 2000 characters')
    .optional(),
  
  past_medical_history: z.string()
    .max(2000, 'Past medical history must be less than 2000 characters')
    .optional(),
  
  family_history: z.string()
    .max(1000, 'Family history must be less than 1000 characters')
    .optional(),
  
  social_history: z.string()
    .max(1000, 'Social history must be less than 1000 characters')
    .optional(),
  
  allergies_current: z.string()
    .max(500, 'Current allergies must be less than 500 characters')
    .optional(),
  
  general_examination: z.string()
    .max(1000, 'General examination must be less than 1000 characters')
    .optional(),
  
  cardiovascular_exam: z.string()
    .max(1000, 'Cardiovascular exam must be less than 1000 characters')
    .optional(),
  
  respiratory_exam: z.string()
    .max(1000, 'Respiratory exam must be less than 1000 characters')
    .optional(),
  
  abdomen_exam: z.string()
    .max(1000, 'Abdomen exam must be less than 1000 characters')
    .optional(),
  
  neurological_exam: z.string()
    .max(1000, 'Neurological exam must be less than 1000 characters')
    .optional(),
  
  other_system_exam: z.string()
    .max(1000, 'Other system exam must be less than 1000 characters')
    .optional(),
  
  primary_diagnosis: z.string()
    .max(500, 'Primary diagnosis must be less than 500 characters')
    .optional(),
  
  differential_diagnosis: z.string()
    .max(1000, 'Differential diagnosis must be less than 1000 characters')
    .optional(),
  
  treatment_plan: z.string()
    .max(2000, 'Treatment plan must be less than 2000 characters')
    .optional(),
  
  clinical_notes: z.string()
    .max(2000, 'Clinical notes must be less than 2000 characters')
    .optional(),
  
  general_advice: z.string()
    .max(1000, 'General advice must be less than 1000 characters')
    .optional(),
  
  lab_tests_ordered: z.array(z.string().max(100))
    .max(20, 'Too many lab tests ordered')
    .optional(),
  
  imaging_ordered: z.array(z.string().max(100))
    .max(10, 'Too many imaging studies ordered')
    .optional(),
  
  referrals: z.string()
    .max(500, 'Referrals must be less than 500 characters')
    .optional(),
  
  next_follow_up_weeks: z.number()
    .int('Follow-up weeks must be a whole number')
    .min(1, 'Follow-up must be at least 1 week')
    .max(52, 'Follow-up cannot exceed 1 year')
    .optional()
});

// Prescription validation
export const prescriptionSchema = z.object({
  medication_name: z.string()
    .min(2, 'Medication name must be at least 2 characters')
    .max(200, 'Medication name must be less than 200 characters'),
  
  strength: z.string()
    .max(50, 'Strength must be less than 50 characters')
    .optional(),
  
  dosage_form: z.string()
    .max(50, 'Dosage form must be less than 50 characters')
    .optional(),
  
  frequency: z.enum(['OD', 'BD', 'TDS', 'QID', 'Q4H', 'Q6H', 'Q8H', 'PRN']),
  
  duration_days: z.number()
    .int('Duration must be a whole number of days')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 1 year'),
  
  food_relation: z.enum(['BF', 'AF', 'WF', 'EF']),
  
  special_instructions: z.string()
    .max(500, 'Special instructions must be less than 500 characters')
    .optional(),
  
  quantity_prescribed: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity seems too high')
    .optional()
});

// Search parameters validation
export const patientSearchSchema = z.object({
  query: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  registration_fee_paid: z.boolean().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

export const visitSearchSchema = z.object({
  patient_id: z.string().uuid().optional(),
  doctor_id: z.string().uuid().optional(),
  visit_date: z.string().optional(),
  visit_type: z.enum(['new', 'follow-up', 'emergency']).optional(),
  status: z.string().optional(),
  consultation_fee_paid: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

// Export type inference helpers  
export type PatientRegistrationFormData = z.infer<typeof patientRegistrationSchema>;
export type VisitCreationFormData = z.infer<typeof visitCreationSchema>;
export type VitalsFormData = z.infer<typeof vitalsSchema>;
export type ConsultationFormData = z.infer<typeof consultationSchema>;
export type PrescriptionFormData = z.infer<typeof prescriptionSchema>;
export type PatientSearchParamsData = z.infer<typeof patientSearchSchema>;
export type VisitSearchParamsData = z.infer<typeof visitSearchSchema>;
