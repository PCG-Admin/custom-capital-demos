-- ============================================================================
-- COMPLETE SETUP FOR AUTHENTICATION
-- ============================================================================
-- This script:
-- 1. Enables pgcrypto extension for password hashing
-- 2. Creates password hashing functions
-- 3. Creates necessary authentication tables if they don't exist
-- 4. Creates authentication helper functions
-- 5. Inserts the admin user with hashed password
-- ============================================================================

-- ============================================================================
-- 1. ENABLE PGCRYPTO EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. CREATE PASSWORD HASHING FUNCTIONS
-- ============================================================================

-- Function to hash a password using bcrypt
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Function to verify a password against a hash
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN password_hash = crypt(password, password_hash);
END;
$$;

-- ============================================================================
-- 3. CREATE AUTHENTICATION TABLES (if they don't exist)
-- ============================================================================

-- User Sessions Table (using custom_ prefix to match existing schema)
CREATE TABLE IF NOT EXISTS public.custom_user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_custom_user_sessions_user_id ON public.custom_user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_user_sessions_token ON public.custom_user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_custom_user_sessions_active ON public.custom_user_sessions(is_active, expires_at);

-- Login Attempts Table (using custom_ prefix to match existing schema)
CREATE TABLE IF NOT EXISTS public.custom_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_login_attempts_email_time ON public.custom_login_attempts(email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_login_attempts_ip_time ON public.custom_login_attempts(ip_address, attempted_at DESC);

-- Account Lockouts Table (using custom_ prefix to match existing schema)
CREATE TABLE IF NOT EXISTS public.custom_account_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ NOT NULL,
    reason TEXT,
    locked_by UUID REFERENCES public.custom_users(id),
    unlock_attempts INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_custom_account_lockouts_user ON public.custom_account_lockouts(user_id, is_active);

-- Audit Logs Table (using custom_ prefix to match existing schema)
CREATE TABLE IF NOT EXISTS public.custom_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.custom_users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_custom_audit_logs_user ON public.custom_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_audit_logs_action ON public.custom_audit_logs(action, created_at DESC);

-- Password Reset Tokens Table (using custom_ prefix to match existing schema)
CREATE TABLE IF NOT EXISTS public.custom_password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.custom_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    is_valid BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_custom_password_reset_tokens_user ON public.custom_password_reset_tokens(user_id);

-- ============================================================================
-- 4. CREATE AUTHENTICATION HELPER FUNCTIONS
-- ============================================================================

-- Check if account is locked
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
        FROM public.custom_account_lockouts
        WHERE user_id = p_user_id
        AND is_active = TRUE
        AND locked_until > NOW()
    ) INTO locked;

    RETURN locked;
END;
$$;

-- Lock account
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
    INSERT INTO public.custom_account_lockouts (
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

-- Record login attempt
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
    INSERT INTO public.custom_login_attempts (
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

-- Check rate limiting
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
    SELECT COUNT(*) INTO attempt_count
    FROM public.custom_login_attempts
    WHERE (email = p_email OR ip_address = p_ip_address)
    AND success = FALSE
    AND attempted_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

    RETURN attempt_count < p_max_attempts;
END;
$$;

-- Create audit log
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
    INSERT INTO public.custom_audit_logs (
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

-- ============================================================================
-- 5. INSERT ADMIN USER
-- ============================================================================

-- Insert admin user with bcrypt hashed password
-- Email: admin@mindrift.com
-- Password: admin123
INSERT INTO public.custom_users (
    id,
    full_name,
    email,
    role,
    responsible_workflow,
    responsible_step,
    password_hash,
    department,
    phone
) VALUES (
    gen_random_uuid(),
    'Platform Administrator',
    'admin@mindrift.com',
    'admin',
    'all',
    'all',
    public.hash_password('admin123'),
    'Administration',
    '+1-555-0100'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = public.hash_password('admin123');

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

-- Verify the admin user was created
SELECT
    id,
    full_name,
    email,
    role,
    responsible_workflow,
    responsible_step,
    department,
    created_at,
    CASE
        WHEN password_hash LIKE '$2%' THEN 'Hashed (bcrypt)'
        ELSE 'PLAIN TEXT - SECURITY RISK!'
    END as password_status
FROM public.custom_users
WHERE email = 'admin@mindrift.com';

-- Test password verification
DO $$
DECLARE
    test_result BOOLEAN;
    user_hash TEXT;
BEGIN
    -- Get the hashed password for admin
    SELECT password_hash INTO user_hash
    FROM public.custom_users
    WHERE email = 'admin@mindrift.com';

    -- Verify correct password
    test_result := public.verify_password('admin123', user_hash);
    RAISE NOTICE 'Password verification test (admin123): %', test_result;

    -- Verify incorrect password
    test_result := public.verify_password('wrongpassword', user_hash);
    RAISE NOTICE 'Password verification test (wrong password): %', test_result;
END $$;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- You can now log in with:
-- Email: admin@mindrift.com
-- Password: admin123
-- ============================================================================
