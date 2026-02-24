import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Prefer service role for server-side operations (storage uploads, inserts) if available.
const serverKey = serviceKey || anonKey

export const isSupabaseConfigured = Boolean(url && serverKey)

let cachedClient: SupabaseClient | null = null

export function createServerClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase environment variables are missing')
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
