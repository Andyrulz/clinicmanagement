import React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

export const Select: React.FC<SelectProps> = ({ children, value, onValueChange }) => {
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, { value, onValueChange })
        }
        return child
      })}
    </div>
  )
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  )
)
SelectTrigger.displayName = 'SelectTrigger'

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => (
  <span className="text-gray-500">{placeholder}</span>
)

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => (
  <div className="absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 shadow-lg">
    {children}
  </div>
)

export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => (
  <div
    className="relative flex cursor-pointer select-none items-center py-2 px-3 text-sm hover:bg-gray-100"
    onClick={() => {/* This would be handled by parent context */}}
    data-value={value}
  >
    {children}
  </div>
)
