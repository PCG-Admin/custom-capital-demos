-- ============================================================================
-- UPDATE ADMIN EMAIL
-- ============================================================================
-- Changes admin email from admin@customcapital.com to admin@test.com
-- ============================================================================

UPDATE public.users
SET email = 'admin@test.com'
WHERE email = 'admin@customcapital.com';

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
    created_at
FROM public.users
WHERE email = 'admin@test.com';

-- ============================================================================
-- Login credentials:
-- Email: admin@test.com
-- Password: password123
-- ============================================================================
