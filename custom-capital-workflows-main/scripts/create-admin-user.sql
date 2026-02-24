-- ============================================================================
-- CREATE GENERIC ADMIN USER
-- ============================================================================
-- Email: admin@test.com
-- Password: password123
-- ============================================================================

INSERT INTO public.users (
    full_name,
    email,
    password_hash,
    role,
    responsible_workflow,
    responsible_step,
    department
) VALUES (
    'Admin User',
    'admin@test.com',
    public.hash_password('password123'),
    'Admin - All Access',
    'application',
    'all',
    'Administration'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT
    id,
    full_name,
    email,
    role,
    responsible_workflow,
    responsible_step,
    CASE
        WHEN password_hash LIKE '$2%' THEN 'Hashed (bcrypt)'
        ELSE 'Not hashed'
    END as password_status,
    created_at
FROM public.users
WHERE email = 'admin@test.com';

-- ============================================================================
-- TEST LOGIN
-- ============================================================================
SELECT public.verify_password(
    'password123',
    (SELECT password_hash FROM public.users WHERE email = 'admin@test.com')
) as password_is_correct;
