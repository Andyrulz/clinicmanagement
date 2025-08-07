import * as React from "react"

interface AlertProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = "", children }, ref) => (
    <div
      ref={ref}
      className={`relative w-full rounded-lg border p-4 ${className}`}
    >
      {children}
    </div>
  )
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = "", children }, ref) => (
    <div
      ref={ref}
      className={`text-sm [&_p]:leading-relaxed ${className}`}
    >
      {children}
    </div>
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
