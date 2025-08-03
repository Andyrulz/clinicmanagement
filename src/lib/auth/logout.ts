import { createClient } from '@/lib/supabase/client'

export const logout = async () => {
  const supabase = createClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    // Clear any local storage or session data if needed
    localStorage.removeItem('user-preferences')
    sessionStorage.clear()
    
    // Redirect to login page
    window.location.href = '/login'
    
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to logout' 
    }
  }
}

export const logoutWithConfirmation = async () => {
  const confirmed = window.confirm('Are you sure you want to logout?')
  if (confirmed) {
    return await logout()
  }
  return { success: false, cancelled: true }
}
