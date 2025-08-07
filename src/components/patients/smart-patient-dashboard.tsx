// Smart Patient Dashboard with Quick Actions and Enhanced Search
// Enhanced with appointment integration, analytics, and streamlined patient management

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Users, 
  Clock, 
  Phone, 
  Calendar,
  TrendingUp,
  Activity,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { searchPatients } from '@/lib/services/patient-service';
import type { Patient } from '@/types/patient';

interface QuickActionCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  action: () => void;
  count?: number;
}

interface PatientSearchResult extends Patient {
  lastVisit?: string;
  nextAppointment?: string;
  status?: 'active' | 'inactive' | 'blocked';
}

interface SmartPatientDashboardProps {
  onPatientSelect?: (patient: Patient) => void;
  onNewPatient?: () => void;
}

export default function SmartPatientDashboard({
  onPatientSelect,
  onNewPatient
}: SmartPatientDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPatients: 0,
    recentRegistrations: 0,
    activePatients: 0,
    scheduledToday: 0
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await searchPatients({
        query: searchQuery,
        limit: 20
      });
      setPatients(result.patients);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all patients
      const allPatientsResult = await searchPatients({ limit: 100 });
      const allPatients = allPatientsResult.patients || [];
      
      // Load recent patients (last 5)
      const recentResult = await searchPatients({ limit: 5 });
      setRecentPatients(recentResult.patients || []);
      
      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const recentCount = allPatients.filter(p => 
        new Date(p.created_at) >= sevenDaysAgo
      ).length;
      
      const activeCount = allPatients.filter(p => 
        new Date(p.created_at) >= thirtyDaysAgo
      ).length;
      
      setStats({
        totalPatients: allPatients.length,
        recentRegistrations: recentCount,
        activePatients: activeCount,
        scheduledToday: 0 // TODO: Connect with appointment service
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Search patients with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setPatients([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const quickActions: QuickActionCard[] = [
    {
      title: 'Emergency Registration',
      description: 'Fast track for urgent cases',
      icon: Plus,
      color: 'bg-red-500 hover:bg-red-600',
      action: () => openRegistration('emergency'),
      count: stats.recentRegistrations
    },
    {
      title: 'Schedule Appointment',
      description: 'Book new appointments',
      icon: Calendar,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => openScheduling(),
      count: stats.scheduledToday
    },
    {
      title: 'Patient Search',
      description: 'Find existing patients',
      icon: Search,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => focusSearch()
    },
    {
      title: 'Today\'s Visits',
      description: 'View scheduled visits',
      icon: Clock,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => openTodaysVisits(),
      count: stats.scheduledToday
    }
  ];

  const openRegistration = (template: string) => {
    // Use the onNewPatient callback if provided, otherwise log
    if (onNewPatient) {
      onNewPatient();
    } else {
      console.log(`Opening ${template} registration`);
    }
  };

  const openScheduling = () => {
    console.log('Opening appointment scheduling');
    // In a real app: router.push('/appointments/schedule')
  };

  const focusSearch = () => {
    document.getElementById('patient-search')?.focus();
  };

  const openTodaysVisits = () => {
    console.log('Opening today\'s visits');
    // In a real app: router.push('/visits/today')
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/(\d{5})(\d{5})/, '$1 $2');
  };

  const getPatientStatus = (patient: PatientSearchResult) => {
    if (!patient.registration_fee_paid) return 'pending-payment';
    if (patient.status === 'inactive') return 'inactive';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending-payment':
        return <Badge className="bg-orange-100 text-orange-800">Payment Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-600 mt-1">
            Manage patient registrations, appointments, and medical records
          </p>
        </div>
        <Button 
          onClick={() => openRegistration('standard')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Patient
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentRegistrations}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active (30 days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activePatients}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduledToday}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto flex-col gap-3 p-4 relative"
                  onClick={action.action}
                >
                  {action.count !== undefined && action.count > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1">
                      {action.count}
                    </Badge>
                  )}
                  <div className={`p-3 rounded-full ${action.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{action.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Smart Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Patient Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="patient-search"
                placeholder="Search by name, phone, or UHID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {loading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Search Results */}
            {patients.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">
                  {searchQuery ? 'Search Results' : 'Recent Patients'}
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => console.log('View patient:', patient.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {formatPhoneNumber(patient.phone || '')}
                              </span>
                              <span>UHID: {patient.uhid}</span>
                              {patient.age && <span>Age: {patient.age}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(getPatientStatus(patient))}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onPatientSelect?.(patient)}
                        >
                          {onPatientSelect ? 'Select' : 'View'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && patients.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No patients found matching &quot;{searchQuery}&quot;</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => openRegistration('standard')}
                >
                  Register New Patient
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPatients.length > 0 ? (
            <div className="space-y-3">
              {recentPatients.map((patient) => (
                <div 
                  key={patient.id} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => onPatientSelect?.(patient)}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <div className="text-xs text-gray-600 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {patient.phone}
                      </span>
                      {patient.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {patient.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A'}</div>
                    <div>{patient.created_at ? new Date(patient.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent registrations</p>
              <p className="text-sm">New patients will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
