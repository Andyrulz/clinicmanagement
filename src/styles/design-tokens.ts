// Design System - Color and Typography Standards
// WCAG AA compliant colors with 4.5:1 contrast ratio minimum

export const designTokens = {
  // Text Colors (High Contrast)
  text: {
    primary: 'text-gray-900',      // #111827 - Main headings and important text
    secondary: 'text-gray-800',    // #1F2937 - Body text and labels
    tertiary: 'text-gray-700',     // #374151 - Secondary information
    muted: 'text-gray-600',        // #4B5563 - Helper text (still readable)
    subtle: 'text-gray-500',       // #6B7280 - Minimal contrast (use sparingly)
  },

  // Background Colors
  background: {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    tertiary: 'bg-gray-100',
    accent: 'bg-blue-50',
  },

  // Interactive Elements
  interactive: {
    primary: {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      disabled: 'bg-gray-300 text-gray-500 cursor-not-allowed',
    },
    secondary: {
      default: 'bg-gray-600 text-white hover:bg-gray-700',
      disabled: 'bg-gray-200 text-gray-400 cursor-not-allowed',
    },
    danger: {
      default: 'bg-red-600 text-white hover:bg-red-700',
      disabled: 'bg-red-200 text-red-400 cursor-not-allowed',
    },
  },

  // Form Elements
  form: {
    label: 'text-gray-800 font-medium',
    input: 'text-gray-900 placeholder:text-gray-500 border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    select: 'text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    helperText: 'text-gray-600',
    errorText: 'text-red-700',
  },

  // Status Colors (High Contrast)
  status: {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200', 
      text: 'text-green-800',
      accent: 'text-green-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      accent: 'text-yellow-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      accent: 'text-red-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      accent: 'text-blue-600',
    },
  },

  // Role Badge Colors (High Contrast)
  roles: {
    admin: 'bg-red-100 text-red-900 border-red-200',
    manager: 'bg-blue-100 text-blue-900 border-blue-200',
    doctor: 'bg-green-100 text-green-900 border-green-200',
    receptionist: 'bg-purple-100 text-purple-900 border-purple-200',
    staff: 'bg-gray-100 text-gray-900 border-gray-200',
  },

  // Typography
  typography: {
    h1: 'text-2xl font-bold text-gray-900',
    h2: 'text-xl font-semibold text-gray-900',
    h3: 'text-lg font-semibold text-gray-800',
    h4: 'text-base font-semibold text-gray-800',
    body: 'text-gray-800',
    caption: 'text-sm text-gray-700',
    small: 'text-xs text-gray-600',
  },

  // Spacing & Layout
  spacing: {
    section: 'mb-6',
    element: 'mb-4',
    tight: 'mb-2',
  },

  // Borders & Shadows
  borders: {
    default: 'border border-gray-200',
    strong: 'border border-gray-300',
    accent: 'border border-blue-200',
  },

  shadows: {
    default: 'shadow-sm',
    elevated: 'shadow-md',
    strong: 'shadow-lg',
  },
}

// Utility function to get role-specific styling
export const getRoleStyles = (role: string) => {
  const roleKey = role.toLowerCase() as keyof typeof designTokens.roles
  return designTokens.roles[roleKey] || designTokens.roles.staff
}

// Utility function for consistent button styling
export const getButtonStyles = (variant: 'primary' | 'secondary' | 'danger' = 'primary', disabled = false) => {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  const variantStyle = disabled 
    ? designTokens.interactive[variant].disabled 
    : designTokens.interactive[variant].default
  
  return `${base} ${variantStyle}`
}
