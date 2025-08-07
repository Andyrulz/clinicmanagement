'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AvailabilityDashboard from '@/components/availability/availability-dashboard';

interface User {
  id: string;
  role: string;
  email: string;
  full_name: string;
}

export default function AvailabilityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          router.push('/login');
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, role, email, full_name')
          .eq('auth_user_id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.error('Error fetching user profile:', profileError);
          router.push('/login');
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading availability dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <AvailabilityDashboard
          doctorId={user.role === 'doctor' ? user.id : undefined}
          userRole={user.role}
        />
      </main>
    </div>
  );
}
