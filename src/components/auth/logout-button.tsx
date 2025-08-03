'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { logout, logoutWithConfirmation } from '@/lib/auth/logout'

interface LogoutButtonProps {
  variant?: 'button' | 'dropdown' | 'icon'
  showConfirmation?: boolean
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ 
  variant = 'button', 
  showConfirmation = true,
  className = '',
  children
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    
    try {
      const result = showConfirmation ? 
        await logoutWithConfirmation() : 
        await logout()
      
      if (!result.success && !('cancelled' in result)) {
        const errorMessage = 'error' in result ? result.error : 'Unknown error'
        alert('Failed to logout: ' + errorMessage)
      }
    } catch (error) {
      console.error('Logout error:', error)
      alert('Failed to logout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const baseClasses = "flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
  
  const variantClasses = {
    button: "px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed",
    dropdown: "w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50",
    icon: "p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label="Logout"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <LogOut className="w-4 h-4 mr-2" />
      )}
      {children || (variant === 'icon' ? '' : 'Logout')}
    </button>
  )
}

export default LogoutButton
