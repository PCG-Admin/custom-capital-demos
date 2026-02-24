-- ============================================================================
-- SECURITY MIGRATION 001: ENABLE RLS AND CREATE POLICIES
-- ============================================================================
-- This script enables Row Level Security on all public tables and creates
-- secure policies to protect sensitive data.
--
-- WARNING: This will lock down database access. Ensure your application
-- uses the service role key for server-side operations.
-- ============================================================================

-- Enable RLS on all public tables
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporting_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
-- ============================================================================

DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_own_policy" ON public.users;
DROP POLICY IF EXISTS "users_admin_all_policy" ON public.users;

DROP POLICY IF EXISTS "suppliers_service_role_all" ON public.suppliers;

DROP POLICY IF EXISTS "applications_service_role_all" ON public.rental_credit_applications;

DROP POLICY IF EXISTS "agreements_service_role_all" ON public.rental_agreements;

DROP POLICY IF EXISTS "supporting_docs_service_role_all" ON public.supporting_documents;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================
-- Users should be able to read their own data and admins can manage all users

-- Allow service role full access (for server-side operations)
CREATE POLICY "users_service_role_all"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read all user data (for workflow assignments)
-- This is needed for the application to function properly
CREATE POLICY "users_authenticated_read"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own last_login_at
CREATE POLICY "users_update_own_login"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- Only admins can insert/delete users (handled via service role in practice)
-- No public INSERT/DELETE policies - must go through server API

-- ============================================================================
-- SUPPLIERS TABLE POLICIES
-- ============================================================================

-- Service role has full access
CREATE POLICY "suppliers_service_role_all"
ON public.suppliers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read suppliers
CREATE POLICY "suppliers_authenticated_read"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- RENTAL CREDIT APPLICATIONS POLICIES
-- ============================================================================

-- Service role has full access
CREATE POLICY "applications_service_role_all"
ON public.rental_credit_applications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read all applications (workflow visibility)
CREATE POLICY "applications_authenticated_read"
ON public.rental_credit_applications
FOR SELECT
TO authenticated
USING (true);

-- Server-side API will handle all mutations via service role
-- No direct INSERT/UPDATE/DELETE for authenticated users

-- ============================================================================
-- RENTAL AGREEMENTS POLICIES
-- ============================================================================

-- Service role has full access
CREATE POLICY "agreements_service_role_all"
ON public.rental_agreements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read all agreements
CREATE POLICY "agreements_authenticated_read"
ON public.rental_agreements
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- SUPPORTING DOCUMENTS POLICIES
-- ============================================================================

-- Service role has full access
CREATE POLICY "supporting_docs_service_role_all"
ON public.supporting_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read all supporting documents
CREATE POLICY "supporting_docs_authenticated_read"
ON public.supporting_documents
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================
-- Note: Storage bucket policies should be configured separately in Supabase dashboard
-- or via the Supabase API. Here's what you should configure:

-- IMPORTANT: Configure these policies in your Supabase dashboard:
--
-- 1. Bucket: 'custom-capital-workflows' or 'custom-capital-documents'
--    Policy Name: "Service role full access"
--    Allowed operations: SELECT, INSERT, UPDATE, DELETE
--    Target roles: service_role
--    Policy: (bucket_id = 'custom-capital-workflows')
--
-- 2. Bucket: 'custom-capital-workflows' or 'custom-capital-documents'
--    Policy Name: "Authenticated users read access"
--    Allowed operations: SELECT
--    Target roles: authenticated
--    Policy: (bucket_id = 'custom-capital-workflows')

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify RLS is properly enabled:

-- Check RLS status on all tables
DO $$
DECLARE
    table_record RECORD;
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE 'Checking RLS status on all tables...';
    RAISE NOTICE '==========================================';

    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'suppliers', 'rental_credit_applications', 'rental_agreements', 'supporting_documents')
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE oid = ('public.' || table_record.tablename)::regclass;

        RAISE NOTICE 'Table: % - RLS Enabled: %', table_record.tablename, rls_enabled;
    END LOOP;

    RAISE NOTICE '==========================================';
END $$;

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- ROLLBACK SCRIPT (USE ONLY IF NEEDED)
-- ============================================================================
-- If you need to disable RLS (NOT RECOMMENDED for production):
--
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.rental_credit_applications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.rental_agreements DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.supporting_documents DISABLE ROW LEVEL SECURITY;
