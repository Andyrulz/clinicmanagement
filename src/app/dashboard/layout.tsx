import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - Clinic Management System',
  description: 'Clinic management dashboard with analytics and patient overview',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1976d2',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
