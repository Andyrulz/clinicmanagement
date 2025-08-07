'use client'

import React from 'react'
import { Download, FileText, ArrowLeft, BarChart3, Users, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
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
                  Reports & Analytics
                </h1>
                <p className="text-gray-600 mt-1">
                  Generate comprehensive reports and insights for your clinic
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200">
                <Download className="w-5 h-5" />
                <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Quick Report Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Revenue Report</h3>
                  <p className="text-sm text-gray-600">Monthly revenue analysis and trends</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Patient Report</h3>
                  <p className="text-sm text-gray-600">Patient demographics and visit patterns</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Doctor Performance</h3>
                  <p className="text-sm text-gray-600">Doctor productivity and metrics</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Appointment Report</h3>
                  <p className="text-sm text-gray-600">Scheduling and visit analysis</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Analytics Summary</h3>
                  <p className="text-sm text-gray-600">Comprehensive clinic overview</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
                Generate Report
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Custom Report</h3>
                  <p className="text-sm text-gray-600">Build your own custom report</p>
                </div>
              </div>
              <button className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 font-medium">
                Create Custom
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Report History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Reports</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline">
              View All Reports
            </button>
          </div>
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reports generated yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start by generating your first report using the templates above. Reports will appear here once created.
            </p>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200">
              Generate First Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}