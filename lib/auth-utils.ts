/**
 * Secure Authentication Utilities
 *
 * This module provides secure authentication functions using bcrypt password hashing,
 * JWT session tokens, rate limiting, and account lockout protection.
 */

import { createServerClient } from '@/lib/supabase-server'
import { SessionUser } from '@/types/user'
import { SignJWT, jwtVerify } from 'jose'

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_IN_PRODUCTION'
)

const SESSION_DURATION = 8 * 60 * 60 // 8 hours in seconds
const REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60 // 7 days in seconds

// Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5
const RATE_LIMIT_WINDOW_MINUTES = 15
const ACCOUNT_LOCKOUT_DURATION_MINUTES = 30

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AuthResult {
  success: boolean
  user?: SessionUser
  sessionToken?: string
  refreshToken?: string
  error?: string
  requiresPasswordChange?: boolean
}

export interface SessionPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

// ============================================================================
// PASSWORD VERIFICATION (using database bcrypt function)
// ============================================================================

/**
 * Verify password using database bcrypt verification
 */
async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('verify_password', {
    password,
    password_hash: passwordHash
  })

  if (error) {
    console.error('[auth-utils] Password verification error:', error)
    return false
  }

  return data === true
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate JWT session token
 */
async function generateSessionToken(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)

  return token
}

/**
 * Generate refresh token
 */
async function generateRefreshToken(userId: string): Promise<string> {
  const token = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify JWT token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as SessionPayload
  } catch (error) {
    console.error('[auth-utils] Token verification failed:', error)
    return null
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check if login attempts exceed rate limit
 */
async function checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_email: email,
    p_ip_address: ipAddress,
    p_time_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
    p_max_attempts: MAX_LOGIN_ATTEMPTS
  })

  if (error) {
    console.error('[auth-utils] Rate limit check error:', error)
    // Fail open - allow attempt if we can't check rate limit
    return true
  }

  return data === true
}

/**
 * Record login attempt
 */
async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  const supabase = createServerClient()

  await supabase.rpc('record_login_attempt', {
    p_email: email,
    p_ip_address: ipAddress,
    p_user_agent: userAgent,
    p_success: success,
    p_failure_reason: failureReason || null
  })
}

// ============================================================================
// ACCOUNT LOCKOUT
// ============================================================================

/**
 * Check if account is locked
 */
async function isAccountLocked(userId: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('is_account_locked', {
    p_user_id: userId
  })

  if (error) {
    console.error('[auth-utils] Account lock check error:', error)
    return false
  }

  return data === true
}

/**
 * Lock account after too many failed attempts
 */
async function lockAccount(userId: string, reason: string): Promise<void> {
  const supabase = createServerClient()

  await supabase.rpc('lock_account', {
    p_user_id: userId,
    p_duration_minutes: ACCOUNT_LOCKOUT_DURATION_MINUTES,
    p_reason: reason
  })
}

/**
 * Check recent failed login attempts for a user
 */
async function getRecentFailedAttempts(email: string): Promise<number> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('login_attempts')
    .select('id')
    .eq('email', email)
    .eq('success', false)
    .gte('attempted_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString())

  if (error) {
    console.error('[auth-utils] Failed to get login attempts:', error)
    return 0
  }

  return data?.length || 0
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create session record in database
 */
async function createSession(
  userId: string,
  sessionToken: string,
  refreshToken: string,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const supabase = createServerClient()

  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000)
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION * 1000)

  await supabase.from('user_sessions').insert({
    user_id: userId,
    session_token: sessionToken,
    refresh_token: refreshToken,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: expiresAt.toISOString(),
    refresh_expires_at: refreshExpiresAt.toISOString(),
    is_active: true
  })
}

/**
 * Invalidate session
 */
export async function invalidateSession(sessionToken: string): Promise<void> {
  const supabase = createServerClient()

  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('session_token', sessionToken)
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionToken: string): Promise<void> {
  const supabase = createServerClient()

  await supabase
    .from('user_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('session_token', sessionToken)
    .eq('is_active', true)
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Create audit log entry
 */
export async function createAuditLog(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  oldValues?: any,
  newValues?: any,
  ipAddress?: string,
  userAgent?: string,
  metadata?: any
): Promise<void> {
  const supabase = createServerClient()

  await supabase.rpc('create_audit_log', {
    p_user_id: userId,
    p_action: action,
    p_resource_type: resourceType || null,
    p_resource_id: resourceId || null,
    p_old_values: oldValues ? JSON.stringify(oldValues) : null,
    p_new_values: newValues ? JSON.stringify(newValues) : null,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
    p_metadata: metadata ? JSON.stringify(metadata) : null
  })
}

// ============================================================================
// MAIN AUTHENTICATION FUNCTION
// ============================================================================

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string,
  ipAddress: string,
  userAgent: string
): Promise<AuthResult> {
  const supabase = createServerClient()

  try {
    // Step 1: Check rate limiting
    const withinRateLimit = await checkRateLimit(email, ipAddress)
    if (!withinRateLimit) {
      await recordLoginAttempt(email, ipAddress, userAgent, false, 'Rate limit exceeded')
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.'
      }
    }

    // Step 2: Fetch user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, role, responsible_workflow, responsible_step, password_hash')
      .eq('email', email)
      .single()

    if (userError || !user) {
      await recordLoginAttempt(email, ipAddress, userAgent, false, 'User not found')
      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    // Step 3: Check if account is locked
    const locked = await isAccountLocked(user.id)
    if (locked) {
      await recordLoginAttempt(email, ipAddress, userAgent, false, 'Account locked')
      return {
        success: false,
        error: 'Account is locked due to too many failed login attempts. Please contact support.'
      }
    }

    // Step 4: Verify password
    const passwordValid = await verifyPassword(password, user.password_hash)
    if (!passwordValid) {
      await recordLoginAttempt(email, ipAddress, userAgent, false, 'Invalid password')

      // Check if we should lock the account
      const failedAttempts = await getRecentFailedAttempts(email)
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS - 1) {
        await lockAccount(user.id, 'Too many failed login attempts')
        return {
          success: false,
          error: 'Too many failed login attempts. Account has been locked for 30 minutes.'
        }
      }

      return {
        success: false,
        error: 'Invalid email or password'
      }
    }

    // Step 5: Generate tokens
    const sessionUser: SessionUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      responsible_workflow: user.responsible_workflow,
      responsible_step: user.responsible_step
    }

    const sessionToken = await generateSessionToken(sessionUser)
    const refreshToken = await generateRefreshToken(user.id)

    // Step 6: Create session record
    await createSession(user.id, sessionToken, refreshToken, ipAddress, userAgent)

    // Step 7: Update last login time
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Step 8: Record successful login
    await recordLoginAttempt(email, ipAddress, userAgent, true)

    // Step 9: Create audit log
    await createAuditLog(
      user.id,
      'USER_LOGIN',
      'user',
      user.id,
      null,
      null,
      ipAddress,
      userAgent
    )

    return {
      success: true,
      user: sessionUser,
      sessionToken,
      refreshToken
    }
  } catch (error) {
    console.error('[auth-utils] Authentication error:', error)
    await recordLoginAttempt(email, ipAddress, userAgent, false, 'System error')
    return {
      success: false,
      error: 'An error occurred during authentication'
    }
  }
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  // Check various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return 'unknown'
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
