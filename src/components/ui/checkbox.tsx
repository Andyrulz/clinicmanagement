import * as React from "react"
import { Check } from "lucide-react"

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, className = "", disabled }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        disabled={disabled}
        className={`peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      />
      {checked && (
        <Check className="absolute top-0 left-0 h-4 w-4 text-blue-600 pointer-events-none" />
      )}
    </div>
  )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
