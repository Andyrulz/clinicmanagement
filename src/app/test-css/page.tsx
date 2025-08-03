'use client'

import Link from 'next/link'

export default function TestCSS() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-xl border">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
          🎨 CSS Test Page
        </h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-green-100 border border-green-400 rounded-md">
            <p className="text-green-800 font-medium">✅ Tailwind CSS is working!</p>
          </div>
          
          <div className="p-4 bg-blue-100 border border-blue-400 rounded-md">
            <p className="text-blue-800">🎨 Gradients and colors work</p>
          </div>
          
          <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-md">
            <p className="text-yellow-800">⚡ Layout and spacing work</p>
          </div>
          
          <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-semibold">
            🚀 Interactive elements work
          </button>
          
          <div className="flex gap-2">
            <div className="flex-1 bg-red-500 h-4 rounded"></div>
            <div className="flex-1 bg-yellow-500 h-4 rounded"></div>
            <div className="flex-1 bg-green-500 h-4 rounded"></div>
            <div className="flex-1 bg-blue-500 h-4 rounded"></div>
            <div className="flex-1 bg-purple-500 h-4 rounded"></div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
