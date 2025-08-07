'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PatientRegistration from '@/components/patients/patient-registration-simple';
import { Patient } from '@/types/patient';
import { searchPatients } from '@/lib/services/patient-service';

export default function PatientsPage() {
  const router = useRouter();
  const [showRegistration, setShowRegistration] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    newThisMonth: 0,
    pendingFees: 0,
    active: 0
  });

  // Fetch patients on component mount and when search changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await searchPatients({ 
          query: searchQuery || undefined,
          limit: 50 
        });
        
        setPatients(result.patients || []);
        
        // Calculate stats
        const total = result.patients?.length || 0;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const newThisMonth = result.patients?.filter((patient: Patient) => {
          if (!patient.created_at) return false;
          const createdDate = new Date(patient.created_at);
          return createdDate.getMonth() === currentMonth && 
                 createdDate.getFullYear() === currentYear;
        }).length || 0;
        
        const pendingFees = result.patients?.filter((patient: Patient) => 
          !patient.registration_fee_paid
        ).length || 0;
        
        const active = result.patients?.filter((patient: Patient) => 
          patient.status === 'active' || patient.is_active
        ).length || 0;
        
        setStats({
          total,
          newThisMonth,
          pendingFees,
          active
        });
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch patients');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchQuery]);

  const handlePatientRegistered = (patient: Patient) => {
    console.log('Patient registered:', patient);
    setShowRegistration(false);
    // Force refresh by updating a dummy state that triggers useEffect
    setSearchQuery(prev => prev === '' ? ' ' : '');
    setTimeout(() => setSearchQuery(''), 100); // Reset after a moment
  };

  if (showRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <PatientRegistration
            onSuccess={handlePatientRegistered}
            onCancel={() => setShowRegistration(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mr-3 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                <span className="font-medium">Dashboard</span>
              </Link>
              <div className="h-8 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Patient Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Register, manage, and track all your patients in one place
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRegistration(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Patient</span>
            </button>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search patients by name, phone, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-gray-900 placeholder:text-gray-500 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 hover:bg-white"
                />
              </div>
            </div>
            <button className="px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 inline-flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Enhanced Patient Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-3xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Registration Fee</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingFees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Patients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Patient List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-semibold text-gray-900">Patient List</h2>
            <p className="text-gray-600 text-sm mt-1">Manage and view all registered patients</p>
          </div>
          
          <div className="p-8">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <p className="text-gray-600 font-medium">Loading patients...</p>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="text-red-600 text-2xl">❌</div>
                </div>
                <h3 className="text-xl font-semibold text-red-900 mb-2">Error Loading Patients</h3>
                <p className="text-red-700 mb-8">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Retry
                </button>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No patients found' : 'No patients registered yet'}
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {searchQuery 
                    ? `No patients match "${searchQuery}". Try a different search term.`
                    : 'Get started by registering your first patient to begin managing your clinic'
                  }
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowRegistration(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 inline-flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Register First Patient</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {patients.map((patient) => (
                  <div 
                    key={patient.id} 
                    className="border border-gray-100 rounded-xl p-6 hover:border-blue-200 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {patient.full_name || `${patient.first_name} ${patient.last_name || ''}`.trim()}
                          </h3>
                          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full font-medium">
                            {patient.uhid}
                          </span>
                          <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                            patient.registration_fee_paid 
                              ? 'bg-green-100 text-green-700 border border-green-200' 
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {patient.registration_fee_paid ? '✓ Fee Paid' : '⏳ Fee Pending'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                          <div className="space-y-2">
                            <p className="text-gray-600"><span className="font-medium text-gray-900">Phone:</span> {patient.phone || 'Not provided'}</p>
                            <p className="text-gray-600"><span className="font-medium text-gray-900">Email:</span> {patient.email || 'Not provided'}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-gray-600"><span className="font-medium text-gray-900">Age:</span> {patient.age || 'Not set'}</p>
                            <p className="text-gray-600"><span className="font-medium text-gray-900">Gender:</span> {patient.gender || 'Not specified'}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-gray-600"><span className="font-medium text-gray-900">Registration Fee:</span> ₹{patient.registration_fee}</p>
                            <p className="text-gray-600"><span className="font-medium text-gray-900">Status:</span> {patient.status || 'Active'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3 ml-6">
                        <button 
                          onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => router.push(`/dashboard/visits/create?patient_id=${patient.id}`)}
                          className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
                        >
                          New Visit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
