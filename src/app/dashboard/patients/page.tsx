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
      <div className="min-h-screen bg-white p-6">
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
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
                <p className="text-gray-700 font-medium mt-1">
                  Register and manage patients in your clinic
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRegistration(true)}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Patient</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search patients by name, phone, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-500 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                />
              </div>
            </div>
            <button className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors inline-flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Patient Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-900">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-900">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.newThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-900">Pending Registration Fee</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingFees}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-900">Active Patients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b-2 border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Patient List</h2>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Loading patients...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">❌</div>
                <h3 className="text-lg font-bold text-red-900 mb-2">Error Loading Patients</h3>
                <p className="text-red-700 font-medium mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {searchQuery ? 'No patients found' : 'No patients registered yet'}
                </h3>
                <p className="text-gray-700 font-medium mb-6">
                  {searchQuery 
                    ? `No patients match "${searchQuery}". Try a different search term.`
                    : 'Get started by registering your first patient'
                  }
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowRegistration(true)}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Register First Patient</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {patients.map((patient) => (
                  <div 
                    key={patient.id} 
                    className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <h3 className="text-lg font-bold text-gray-900">
                            {patient.full_name || `${patient.first_name} ${patient.last_name || ''}`.trim()}
                          </h3>
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {patient.uhid}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded ${
                            patient.registration_fee_paid 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {patient.registration_fee_paid ? '✓ Fee Paid' : '⏳ Fee Pending'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Phone:</strong> {patient.phone || 'Not provided'}</p>
                            <p><strong>Email:</strong> {patient.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p><strong>Age:</strong> {patient.age || 'Not set'}</p>
                            <p><strong>Gender:</strong> {patient.gender || 'Not specified'}</p>
                          </div>
                          <div>
                            <p><strong>Registration Fee:</strong> ₹{patient.registration_fee}</p>
                            <p><strong>Status:</strong> {patient.status || 'Active'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => router.push(`/dashboard/visits/create?patient_id=${patient.id}`)}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors"
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
