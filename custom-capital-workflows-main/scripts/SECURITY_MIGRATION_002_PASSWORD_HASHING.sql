-- ============================================================================
-- SECURITY MIGRATION 002: IMPLEMENT PASSWORD HASHING
-- ============================================================================
-- This script migrates from plain text passwords to bcrypt hashed passwords
-- and creates helper functions for secure password management.
--
-- IMPORTANT: Run this AFTER Migration 001 (RLS)
-- ============================================================================

-- Ensure pgcrypto extension is available (for crypt function)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- CREATE PASSWORD HASHING HELPER FUNCTIONS
-- ============================================================================

-- Function to hash a password using bcrypt
-- Usage: SELECT hash_password('mypassword123');
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use bcrypt with default cost factor (10)
    RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Function to verify a password against a hash
-- Usage: SELECT verify_password('mypassword123', hashed_password);
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Compare password with hash using crypt
    RETURN password_hash = crypt(password, password_hash);
END;
$$;

-- ============================================================================
-- BACKUP EXISTING PASSWORD DATA (for safety)
-- ============================================================================

-- Create a backup table with current plain text passwords
-- This should be DELETED after successful migration and testing
CREATE TABLE IF NOT EXISTS public.users_password_backup (
    id UUID,
    email TEXT,
    old_password_hash TEXT,
    backed_up_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup current passwords (even though they're plain text)
INSERT INTO public.users_password_backup (id, email, old_password_hash)
SELECT id, email, password_hash
FROM public.users
ON CONFLICT DO NOTHING;

-- ============================================================================
-- HASH ALL EXISTING PASSWORDS
-- ============================================================================

-- Update all existing plain text passwords to bcrypt hashes
-- This will hash: admin123, intake123, credit123, deal123, review123, committee123
UPDATE public.users
SET password_hash = public.hash_password(password_hash)
WHERE password_hash NOT LIKE '$2%'; -- Only hash if not already a bcrypt hash

-- ============================================================================
-- CREATE SECURE USER REGISTRATION FUNCTION
-- ============================================================================

-- Function to create a new user with hashed password
CREATE OR REPLACE FUNCTION public.create_user(
    p_full_name TEXT,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_responsible_workflow TEXT,
    p_responsible_step TEXT,
    p_department TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Validate password strength (minimum 12 characters, must include uppercase, lowercase, number)
    IF LENGTH(p_password) < 12 THEN
        RAISE EXCEPTION 'Password must be at least 12 characters long';
    END IF;

    IF p_password !~ '[A-Z]' THEN
        RAISE EXCEPTION 'Password must contain at least one uppercase letter';
    END IF;

    IF p_password !~ '[a-z]' THEN
        RAISE EXCEPTION 'Password must contain at least one lowercase letter';
    END IF;

    IF p_password !~ '[0-9]' THEN
        RAISE EXCEPTION 'Password must contain at least one number';
    END IF;

    -- Insert new user with hashed password
    INSERT INTO public.users (
        full_name,
        email,
        password_hash,
        role,
        responsible_workflow,
        responsible_step,
        department,
        phone
    ) VALUES (
        p_full_name,
        p_email,
        public.hash_password(p_password),
        p_role,
        p_responsible_workflow,
        p_responsible_step,
        p_department,
        p_phone
    )
    RETURNING id INTO new_user_id;

    RETURN new_user_id;
END;
$$;

-- ============================================================================
-- CREATE PASSWORD UPDATE FUNCTION
-- ============================================================================

-- Function to update user password securely
CREATE OR REPLACE FUNCTION public.update_user_password(
    p_user_id UUID,
    p_old_password TEXT,
    p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_hash TEXT;
    password_valid BOOLEAN;
BEGIN
    -- Get current password hash
    SELECT password_hash INTO current_hash
    FROM public.users
    WHERE id = p_user_id;

    IF current_hash IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Verify old password
    password_valid := public.verify_password(p_old_password, current_hash);

    IF NOT password_valid THEN
        RAISE EXCEPTION 'Current password is incorrect';
    END IF;

    -- Validate new password strength
    IF LENGTH(p_new_password) < 12 THEN
        RAISE EXCEPTION 'New password must be at least 12 characters long';
    END IF;

    IF p_new_password !~ '[A-Z]' THEN
        RAISE EXCEPTION 'New password must contain at least one uppercase letter';
    END IF;

    IF p_new_password !~ '[a-z]' THEN
        RAISE EXCEPTION 'New password must contain at least one lowercase letter';
    END IF;

    IF p_new_password !~ '[0-9]' THEN
        RAISE EXCEPTION 'New password must contain at least one number';
    END IF;

    -- Update password
    UPDATE public.users
    SET password_hash = public.hash_password(p_new_password)
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- CREATE ADMIN PASSWORD RESET FUNCTION
-- ============================================================================

-- Function for admins to reset user passwords
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role TEXT;
BEGIN
    -- Verify admin permissions
    SELECT role INTO admin_role
    FROM public.users
    WHERE id = p_admin_id;

    IF admin_role IS NULL THEN
        RAISE EXCEPTION 'Admin user not found';
    END IF;

    IF admin_role NOT ILIKE '%admin%' AND admin_role NOT ILIKE '%all access%' THEN
        RAISE EXCEPTION 'Insufficient permissions - admin role required';
    END IF;

    -- Validate new password strength
    IF LENGTH(p_new_password) < 12 THEN
        RAISE EXCEPTION 'New password must be at least 12 characters long';
    END IF;

    IF p_new_password !~ '[A-Z]' THEN
        RAISE EXCEPTION 'New password must contain at least one uppercase letter';
    END IF;

    IF p_new_password !~ '[a-z]' THEN
        RAISE EXCEPTION 'New password must contain at least one lowercase letter';
    END IF;

    IF p_new_password !~ '[0-9]' THEN
        RAISE EXCEPTION 'New password must contain at least one number';
    END IF;

    -- Update password
    UPDATE public.users
    SET password_hash = public.hash_password(p_new_password)
    WHERE id = p_target_user_id;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all passwords are now hashed (bcrypt hashes start with $2a$ or $2b$)
SELECT
    email,
    CASE
        WHEN password_hash LIKE '$2%' THEN 'Hashed (bcrypt)'
        ELSE 'PLAIN TEXT - SECURITY RISK!'
    END as password_status,
    LENGTH(password_hash) as hash_length
FROM public.users
ORDER BY email;

-- Test password hashing and verification
DO $$
DECLARE
    test_password TEXT := 'TestPassword123';
    test_hash TEXT;
    verify_result BOOLEAN;
BEGIN
    RAISE NOTICE 'Testing password hashing...';

    -- Hash a test password
    test_hash := public.hash_password(test_password);
    RAISE NOTICE 'Hashed password: %', test_hash;

    -- Verify correct password
    verify_result := public.verify_password(test_password, test_hash);
    RAISE NOTICE 'Verify correct password: %', verify_result;

    -- Verify incorrect password
    verify_result := public.verify_password('WrongPassword123', test_hash);
    RAISE NOTICE 'Verify incorrect password: %', verify_result;
END $$;

-- ============================================================================
-- CLEANUP INSTRUCTIONS
-- ============================================================================

-- After successful migration and testing, DROP the backup table:
-- DROP TABLE IF EXISTS public.users_password_backup;

-- ============================================================================
-- NEW USER CREATION EXAMPLES
-- ============================================================================

-- Example: Create a new user with secure password
-- SELECT public.create_user(
--     'Jane Doe',
--     'jane.doe@customcapital.com',
--     'SecurePassword123!',
--     'Credit Analyst',
--     'rental_credit_application',
--     'Credit Check',
--     'Credit Risk',
--     '+1-555-2000'
-- );

-- Example: Update password
-- SELECT public.update_user_password(
--     '90000000-0000-0000-0000-000000000000'::UUID,
--     'admin123',  -- old password (will fail after migration)
--     'NewSecureAdminPassword123!'
-- );

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. All existing passwords (admin123, intake123, etc.) are now HASHED
-- 2. Users will need to use their ORIGINAL passwords for first login after migration
-- 3. The application code MUST use verify_password() function for authentication
-- 4. Minimum password requirements: 12 chars, uppercase, lowercase, number
-- 5. Consider implementing password expiration policy
-- 6. Consider implementing account lockout after failed login attempts
-- 7. Consider implementing 2FA for additional security
