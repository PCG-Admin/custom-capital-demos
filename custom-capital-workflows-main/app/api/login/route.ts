import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { mockUsers } from '@/lib/mock-users'
import { authenticateUser, getClientIp, getUserAgent } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    let authenticatedUser:
      | {
          id: string
          full_name: string
          role: string
          responsible_workflow: string
          responsible_step: string
        }
      | null = null
    let sessionToken: string | undefined
    let refreshToken: string | undefined

    if (isSupabaseConfigured) {
      // Use secure authentication with bcrypt, rate limiting, and audit logging
      const ipAddress = getClientIp(request)
      const userAgent = getUserAgent(request)

      const authResult = await authenticateUser(email, password, ipAddress, userAgent)

      if (!authResult.success) {
        // Return error with appropriate status code
        const statusCode = authResult.error?.includes('locked') ? 423 : 401
        return NextResponse.json({ error: authResult.error }, { status: statusCode })
      }

      authenticatedUser = authResult.user!
      sessionToken = authResult.sessionToken
      refreshToken = authResult.refreshToken
    } else {
      // Fallback to mock users (development only)
      const mockUser = mockUsers.find(
        (user) => user.email === email && user.password === password
      )
      if (mockUser) {
        const { password: _pw, ...safeUser } = mockUser
        authenticatedUser = safeUser
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const response = NextResponse.json({
      success: true,
      user: authenticatedUser,
    })

    // Set secure session cookie
    if (sessionToken) {
      response.cookies.set('cc_session', sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      })

      // Set refresh token cookie
      if (refreshToken) {
        response.cookies.set('cc_refresh', refreshToken, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      }
    } else {
      // Fallback for mock users (development only)
      response.cookies.set('cc_session', authenticatedUser.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      })
    }

    return response
  } catch (error) {
    console.error('[auth] Login error', error)
    const message =
      error instanceof Error ? error.message : 'Failed to sign in'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
