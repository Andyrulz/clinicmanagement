import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { doctorAvailabilityService } from '@/lib/services/doctor-availability';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';

    switch (action) {
      case 'availabilities':
        const availabilities = await doctorAvailabilityService.getDoctorAvailability();
        return NextResponse.json({
          success: true,
          action: 'get_availabilities',
          data: availabilities
        });

      case 'stats':
        const stats = await doctorAvailabilityService.getAvailabilityStats();
        return NextResponse.json({
          success: true,
          action: 'get_stats',
          data: stats
        });

      case 'test':
      default:
        return NextResponse.json({
          success: true,
          message: 'Doctor Availability API is working',
          available_actions: [
            'availabilities - Get all doctor availabilities',
            'stats - Get availability statistics',
            'test - This test endpoint'
          ],
          usage: 'Add ?action=<action_name> to test different endpoints'
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create_availability':
        const result = await doctorAvailabilityService.createAvailability(data);
        return NextResponse.json(result);

      case 'generate_slots':
        const slotsResult = await doctorAvailabilityService.generateTimeSlots(data);
        return NextResponse.json(slotsResult);

      case 'get_available_slots':
        const availableSlots = await doctorAvailabilityService.getAvailableSlots(data);
        return NextResponse.json(availableSlots);

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Available actions: create_availability, generate_slots, get_available_slots'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
