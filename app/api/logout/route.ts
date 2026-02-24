import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { invalidateSession, createAuditLog, getClientIp, getUserAgent } from '@/lib/auth-utils'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Get current user before invalidating session
    const user = await getCurrentUser()

    // Get session token from cookies
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('cc_session')

    if (sessionCookie?.value) {
      // Invalidate session in database
      await invalidateSession(sessionCookie.value).catch((err) => {
        console.error('[logout] Failed to invalidate session:', err)
      })

      // Create audit log if we have user info
      if (user) {
        const ipAddress = getClientIp(request)
        const userAgent = getUserAgent(request)
        await createAuditLog(
          user.id,
          'USER_LOGOUT',
          'user',
          user.id,
          null,
          null,
          ipAddress,
          userAgent
        ).catch((err) => {
          console.error('[logout] Failed to create audit log:', err)
        })
      }
    }

    // Clear all session cookies
    const response = NextResponse.json({ success: true })

    response.cookies.set('cc_session', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

    response.cookies.set('cc_refresh', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('[logout] Error:', error)
    // Still clear cookies even if there's an error
    const response = NextResponse.json({ success: true })
    response.cookies.set('cc_session', '', { maxAge: 0, path: '/' })
    response.cookies.set('cc_refresh', '', { maxAge: 0, path: '/' })
    return response
  }
}
