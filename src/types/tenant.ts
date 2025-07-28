// Tenant type definitions

export interface Tenant {
  id: string
  name: string
  slug: string
  registration_number?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
  phone?: string
  email?: string
  subscription_plan?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantUser {
  id: string
  full_name: string
  email: string
  role: string
  tenant_id: string
  created_at: string
}
