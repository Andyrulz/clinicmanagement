// Doctor Availability System Types
// TypeScript interfaces and types for the doctor availability system
// Date: August 2, 2025

// =================================================================
// DATABASE ENTITY TYPES
// =================================================================

export interface DoctorAvailability {
  id: string;
  tenant_id: string;
  doctor_id: string;
  
  // Schedule Definition
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  
  // Slot Configuration
  slot_duration_minutes: number;
  buffer_time_minutes: number;
  max_patients_per_slot: number;
  
  // Availability Status
  is_active: boolean;
  availability_type: 'regular' | 'special' | 'break' | 'unavailable';
  
  // Date Range
  effective_from: string; // ISO date
  effective_until: string | null; // ISO date or null
  
  // Metadata
  notes: string | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  created_by: string | null;
  updated_by: string | null;
}

export interface DoctorTimeSlot {
  id: string;
  tenant_id: string;
  doctor_id: string;
  availability_id: string;
  
  // Slot Details
  slot_date: string; // ISO date
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  
  // Booking Status
  is_available: boolean;
  is_booked: boolean;
  current_bookings: number;
  max_bookings: number;
  
  // References
  visit_id: string | null;
  
  // Metadata
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

// =================================================================
// EXTENDED TYPES WITH RELATIONS
// =================================================================

export interface DoctorAvailabilityWithDoctor extends DoctorAvailability {
  doctor: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
}

export interface DoctorTimeSlotWithDetails extends DoctorTimeSlot {
  doctor: {
    id: string;
    full_name: string;
    email: string;
  };
  availability: {
    id: string;
    availability_type: string;
    slot_duration_minutes: number;
  };
  visit?: {
    id: string;
    visit_number: string;
    patient_name: string;
  } | null;
}

// =================================================================
// API REQUEST/RESPONSE TYPES
// =================================================================

export interface CreateAvailabilityRequest {
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes?: number;
  buffer_time_minutes?: number;
  max_patients_per_slot?: number;
  availability_type?: 'regular' | 'special' | 'break' | 'unavailable';
  effective_from?: string;
  effective_until?: string;
  notes?: string;
}

export interface UpdateAvailabilityRequest extends Partial<CreateAvailabilityRequest> {
  id: string;
  is_active?: boolean;
}

export interface GenerateSlotsRequest {
  doctor_id: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
}

export interface BookSlotRequest {
  slot_id: string;
  visit_id: string;
}

export interface CancelBookingRequest {
  slot_id: string;
  visit_id: string;
}

export interface GetAvailableSlotsRequest {
  doctor_id: string;
  start_date: string; // ISO date
  end_date?: string; // ISO date, optional
}

// =================================================================
// API RESPONSE TYPES
// =================================================================

export interface AvailabilityResponse {
  success: boolean;
  data?: DoctorAvailability;
  error?: string;
}

export interface AvailabilitiesResponse {
  success: boolean;
  data?: DoctorAvailabilityWithDoctor[];
  error?: string;
}

export interface TimeSlotResponse {
  success: boolean;
  data?: DoctorTimeSlot;
  error?: string;
}

export interface TimeSlotsResponse {
  success: boolean;
  data?: DoctorTimeSlotWithDetails[];
  error?: string;
}

export interface GenerateSlotsResponse {
  success: boolean;
  data?: {
    doctor_id: string;
    doctor_name: string;
    slots_created: number;
  }[];
  error?: string;
}

export interface BookingResponse {
  success: boolean;
  data?: {
    slot_id: string;
    visit_id: string;
    booked: boolean;
  };
  error?: string;
}

// =================================================================
// UI STATE TYPES
// =================================================================

export interface CalendarView {
  type: 'daily' | 'weekly' | 'monthly';
  date: Date;
  selectedDoctorId?: string;
}

export interface AvailabilityFormData {
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_time_minutes: number;
  max_patients_per_slot: number;
  availability_type: 'regular' | 'special' | 'break' | 'unavailable';
  effective_from: string;
  effective_until: string;
  notes: string;
}

export interface SlotSelectionState {
  selectedSlot?: DoctorTimeSlotWithDetails;
  isBooking: boolean;
  bookingVisitId?: string;
}

export interface AvailabilityFilter {
  doctorId?: string;
  startDate: string;
  endDate: string;
  availabilityType?: string;
  isActive?: boolean;
}

// =================================================================
// UTILITY TYPES
// =================================================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AvailabilityType = 'regular' | 'special' | 'break' | 'unavailable';

export type TimeSlotStatus = 'available' | 'booked' | 'partially_booked' | 'unavailable';

export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface DateRange {
  start: string; // ISO date
  end: string; // ISO date
}

// =================================================================
// HELPER TYPES FOR FORMS AND VALIDATIONS
// =================================================================

export interface AvailabilityValidationErrors {
  doctor_id?: string;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  slot_duration_minutes?: string;
  buffer_time_minutes?: string;
  max_patients_per_slot?: string;
  effective_from?: string;
  effective_until?: string;
  time_range?: string; // For overall time validation
}

export interface SlotBookingValidationErrors {
  slot_id?: string;
  visit_id?: string;
  availability?: string;
  capacity?: string;
}

// =================================================================
// CALENDAR COMPONENT TYPES
// =================================================================

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  slots: DoctorTimeSlotWithDetails[];
  hasAvailability: boolean;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-based
  weeks: CalendarWeek[];
}

export interface CalendarSlotDisplay {
  slot: DoctorTimeSlotWithDetails;
  displayTime: string;
  status: TimeSlotStatus;
  isSelectable: boolean;
}

// =================================================================
// DASHBOARD/ANALYTICS TYPES
// =================================================================

export interface AvailabilityStats {
  total_doctors: number;
  doctors_with_availability: number;
  total_slots_this_week: number;
  booked_slots_this_week: number;
  available_slots_this_week: number;
  booking_rate_percentage: number;
}

export interface DoctorAvailabilityStats {
  doctor_id: string;
  doctor_name: string;
  total_slots: number;
  booked_slots: number;
  available_slots: number;
  booking_rate: number;
  next_available_slot?: string; // ISO datetime
}

// =================================================================
// ERROR TYPES
// =================================================================

export interface AvailabilityError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export type AvailabilityErrorCode = 
  | 'DOCTOR_NOT_FOUND'
  | 'INVALID_TIME_RANGE'
  | 'SLOT_ALREADY_BOOKED'
  | 'SLOT_NOT_AVAILABLE'
  | 'INSUFFICIENT_CAPACITY'
  | 'INVALID_DATE_RANGE'
  | 'OVERLAPPING_AVAILABILITY'
  | 'UNAUTHORIZED_ACCESS'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR';

// =================================================================
// CONSTANTS
// =================================================================

export const DAY_NAMES = [
  'Sunday',
  'Monday', 
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
] as const;

export const DAY_ABBREVIATIONS = [
  'Sun',
  'Mon',
  'Tue', 
  'Wed',
  'Thu',
  'Fri',
  'Sat'
] as const;

export const AVAILABILITY_TYPES = [
  { value: 'regular', label: 'Regular Hours' },
  { value: 'special', label: 'Special Hours' },
  { value: 'break', label: 'Break Time' },
  { value: 'unavailable', label: 'Unavailable' }
] as const;

export const DEFAULT_SLOT_DURATION = 30; // minutes
export const DEFAULT_BUFFER_TIME = 5; // minutes
export const DEFAULT_MAX_PATIENTS_PER_SLOT = 1;

// =================================================================
// TYPE GUARDS
// =================================================================

export function isDoctorAvailability(obj: unknown): obj is DoctorAvailability {
  if (!obj || typeof obj !== 'object') return false;
  
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.doctor_id === 'string' &&
    typeof record.day_of_week === 'number' &&
    typeof record.start_time === 'string' &&
    typeof record.end_time === 'string'
  );
}

export function isDoctorTimeSlot(obj: unknown): obj is DoctorTimeSlot {
  if (!obj || typeof obj !== 'object') return false;
  
  const record = obj as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.doctor_id === 'string' &&
    typeof record.slot_date === 'string' &&
    typeof record.start_time === 'string' &&
    typeof record.end_time === 'string'
  );
}

export function isValidDayOfWeek(day: unknown): day is DayOfWeek {
  return typeof day === 'number' && day >= 0 && day <= 6;
}

export function isValidAvailabilityType(type: unknown): type is AvailabilityType {
  return typeof type === 'string' && 
    ['regular', 'special', 'break', 'unavailable'].includes(type);
}
