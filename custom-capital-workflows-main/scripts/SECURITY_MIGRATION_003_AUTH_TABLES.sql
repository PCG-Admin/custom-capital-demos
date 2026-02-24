-- ============================================================================
-- SECURITY MIGRATION 003: CREATE AUTH AND SESSION TABLES
-- ============================================================================
-- This script creates tables for managing authentication sessions, refresh
-- tokens, login attempts, and audit logs.
--
-- IMPORTANT: Run this AFTER Migration 002 (Password Hashing)
-- ============================================================================

-- ============================================================================
-- SESSION TABLE
-- ============================================================================
-- Stores active user sessions with JWT tokens

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON public.user_sessions(refresh_token) WHERE refresh_token IS NOT NULL;

-- ============================================================================
-- LOGIN ATTEMPTS TABLE (for rate limiting and security monitoring)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON public.login_attempts(success, attempted_at DESC);

-- ============================================================================
-- ACCOUNT LOCKOUT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ NOT NULL,
    reason TEXT,
    locked_by UUID REFERENCES public.users(id),
    unlock_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_user ON public.account_lockouts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_active ON public.account_lockouts(is_active, locked_until);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token) WHERE is_valid = TRUE;

-- ============================================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- User Sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_sessions_service_role_all"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can only read their own sessions
CREATE POLICY "user_sessions_read_own"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Login Attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "login_attempts_service_role_all"
ON public.login_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all login attempts
CREATE POLICY "login_attempts_admin_read"
ON public.login_attempts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND (role ILIKE '%admin%' OR role ILIKE '%all access%')
    )
);

-- Account Lockouts
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_lockouts_service_role_all"
ON public.account_lockouts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_service_role_all"
ON public.audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can read all audit logs
CREATE POLICY "audit_logs_admin_read"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id::text = auth.uid()::text
        AND (role ILIKE '%admin%' OR role ILIKE '%all access%')
    )
);

-- Password Reset Tokens
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_reset_tokens_service_role_all"
ON public.password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    locked BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.account_lockouts
        WHERE user_id = p_user_id
        AND is_active = TRUE
        AND locked_until > NOW()
    ) INTO locked;

    RETURN locked;
END;
$$;

-- Function to lock account
CREATE OR REPLACE FUNCTION public.lock_account(
    p_user_id UUID,
    p_duration_minutes INTEGER DEFAULT 30,
    p_reason TEXT DEFAULT 'Too many failed login attempts'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lockout_id UUID;
BEGIN
    INSERT INTO public.account_lockouts (
        user_id,
        locked_until,
        reason,
        is_active
    ) VALUES (
        p_user_id,
        NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
        p_reason,
        TRUE
    )
    RETURNING id INTO lockout_id;

    RETURN lockout_id;
END;
$$;

-- Function to unlock account
CREATE OR REPLACE FUNCTION public.unlock_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.account_lockouts
    SET is_active = FALSE
    WHERE user_id = p_user_id
    AND is_active = TRUE;

    RETURN TRUE;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_email TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attempt_id UUID;
BEGIN
    INSERT INTO public.login_attempts (
        email,
        ip_address,
        user_agent,
        success,
        failure_reason
    ) VALUES (
        p_email,
        p_ip_address,
        p_user_agent,
        p_success,
        p_failure_reason
    )
    RETURNING id INTO attempt_id;

    RETURN attempt_id;
END;
$$;

-- Function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_email TEXT,
    p_ip_address TEXT,
    p_time_window_minutes INTEGER DEFAULT 15,
    p_max_attempts INTEGER DEFAULT 5
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    -- Count failed attempts in time window
    SELECT COUNT(*) INTO attempt_count
    FROM public.login_attempts
    WHERE (email = p_email OR ip_address = p_ip_address)
    AND success = FALSE
    AND attempted_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

    RETURN attempt_count < p_max_attempts;
END;
$$;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_values,
        p_new_values,
        p_ip_address,
        p_user_agent,
        p_metadata
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.user_sessions
    WHERE expires_at < NOW()
    OR (is_active = FALSE AND last_activity_at < NOW() - INTERVAL '7 days');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Function to clean up old login attempts (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- List all new tables
SELECT table_name, row_security
FROM information_schema.tables t
LEFT JOIN (
    SELECT tablename, relrowsecurity as row_security
    FROM pg_tables pt
    JOIN pg_class pc ON pc.oid = ('public.' || pt.tablename)::regclass
    WHERE schemaname = 'public'
) rls ON rls.tablename = t.table_name
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens')
ORDER BY table_name;

-- List all policies on new tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens')
ORDER BY tablename, policyname;

-- ============================================================================
-- SCHEDULED CLEANUP (Optional - configure in Supabase)
-- ============================================================================

-- You can set up pg_cron jobs in Supabase to run these periodically:
--
-- Daily cleanup of expired sessions:
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT public.cleanup_expired_sessions()');
--
-- Weekly cleanup of old login attempts:
-- SELECT cron.schedule('cleanup-login-attempts', '0 3 * * 0', 'SELECT public.cleanup_old_login_attempts()');

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Record a failed login attempt
-- SELECT public.record_login_attempt(
--     'user@example.com',
--     '192.168.1.1',
--     'Mozilla/5.0...',
--     FALSE,
--     'Invalid password'
-- );

-- Check if rate limit exceeded
-- SELECT public.check_rate_limit('user@example.com', '192.168.1.1');

-- Lock an account
-- SELECT public.lock_account(
--     '90000000-0000-0000-0000-000000000000'::UUID,
--     30,
--     'Too many failed login attempts'
-- );

-- Check if account is locked
-- SELECT public.is_account_locked('90000000-0000-0000-0000-000000000000'::UUID);

-- Create audit log entry
-- SELECT public.create_audit_log(
--     '90000000-0000-0000-0000-000000000000'::UUID,
--     'USER_LOGIN',
--     NULL,
--     NULL,
--     NULL,
--     NULL,
--     '192.168.1.1',
--     'Mozilla/5.0...'
-- );
