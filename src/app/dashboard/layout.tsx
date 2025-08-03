import { Metadata, Viewport } from 'next'
import { DashboardLayout } from '@/components/auth/dashboard-layout'

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

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}
