import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Prefer service role for server-side operations (storage uploads, inserts) if available.
const serverKey = serviceKey || anonKey

export const isSupabaseConfigured = Boolean(url && serverKey)

let cachedClient: SupabaseClient | null = null

export function createServerClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    console.warn('Supabase environment variables are missing. Some features may not work.')
    // Return a dummy client to prevent crashes during deployment
    // This allows the app to load even without Supabase configured
    return createClient(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  }

  if (cachedClient) return cachedClient

  cachedClient = createClient(url, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedClient
}
