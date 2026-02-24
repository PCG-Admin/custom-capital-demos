import { cookies } from 'next/headers'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { SessionUser } from '@/types/user'
import { mockUsers } from '@/lib/mock-users'
import { verifySessionToken, updateSessionActivity } from '@/lib/auth-utils'

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('cc_session')
    if (!session?.value) return null

    if (!isSupabaseConfigured) {
      // Development mode - use mock users
      const mockUser = mockUsers.find((user) => user.id === session.value)
      if (!mockUser) return null
      const { password, ...safeUser } = mockUser
      return safeUser
    }

    // Production mode - verify JWT token
    const sessionToken = session.value

    // Verify JWT token
    const payload = await verifySessionToken(sessionToken)
    if (!payload) {
      console.error('[auth] Invalid or expired session token')
      return null
    }

    // Fetch user from database to get latest data
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_users')
      .select('id, full_name, email, role, responsible_workflow, responsible_step')
      .eq('id', payload.userId)
      .single()

    if (error || !data) {
      console.error('[auth] User not found:', error)
      return null
    }

    // Update session activity
    await updateSessionActivity(sessionToken).catch((err) => {
      console.error('[auth] Failed to update session activity:', err)
    })

    return data as SessionUser
  } catch (error) {
    console.error('[auth] Failed to load current user', error)
    return null
  }
}

export function canUserActOnStep(
  user: SessionUser | null,
  workflowType: 'application',
  stepNumber: number
) {
  // All authenticated users can view, but only users with appropriate roles can modify
  if (!user) return false

  // Admins can act on any step
  if (user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')) {
    return true
  }

  // Users can act on workflows they're responsible for
  if (user.responsible_workflow === 'all' || user.responsible_workflow === workflowType) {
    return true
  }

  // Fallback: authenticated users can view but not modify
  return false
}

export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false
  return user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')
}

export function hasRole(user: SessionUser | null, ...roles: string[]): boolean {
  if (!user) return false
  return roles.some(role => user.role.toLowerCase().includes(role.toLowerCase()))
}
