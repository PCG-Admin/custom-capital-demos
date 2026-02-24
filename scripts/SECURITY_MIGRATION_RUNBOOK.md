# Security Migration Runbook

This runbook provides step-by-step instructions for deploying the security improvements to your Custom Capital Workflows application.

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Migration Steps](#migration-steps)
3. [Post-Migration Verification](#post-migration-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Additional Security Measures](#additional-security-measures)

---

## Pre-Migration Checklist

### Before You Begin

- [ ] **Backup Database**: Create a full backup of your Supabase database
- [ ] **Test Environment**: Test these migrations in a staging/development environment first
- [ ] **Downtime Window**: Plan for a brief maintenance window (recommended: 30-60 minutes)
- [ ] **User Notification**: Notify users of the upcoming security upgrade
- [ ] **Environment Variables**: Ensure the following are set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `JWT_SECRET` (generate a secure random string: `openssl rand -base64 32`)

### Required Dependencies

Add the following npm package:

```bash
npm install jose
```

This is required for JWT token generation and verification.

---

## Migration Steps

### Step 1: Database Backup

**CRITICAL: Create a backup before proceeding**

```sql
-- In Supabase SQL Editor, verify you can create a backup
-- Or use Supabase Dashboard > Database > Backups
```

### Step 2: Run SQL Migration 001 - Enable RLS

**File**: `scripts/SECURITY_MIGRATION_001_ENABLE_RLS.sql`

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the entire contents of `SECURITY_MIGRATION_001_ENABLE_RLS.sql`
5. Execute the query
6. Verify output shows RLS enabled for all tables

**Expected Output**:
```
Table: users - RLS Enabled: true
Table: suppliers - RLS Enabled: true
Table: rental_credit_applications - RLS Enabled: true
Table: rental_agreements - RLS Enabled: true
Table: supporting_documents - RLS Enabled: true
```

**⚠️ WARNING**: After this step, the application will NOT work properly until Step 4 is complete.

### Step 3: Run SQL Migration 002 - Password Hashing

**File**: `scripts/SECURITY_MIGRATION_002_PASSWORD_HASHING.sql`

1. In Supabase SQL Editor, create a new query
2. Copy and paste the entire contents of `SECURITY_MIGRATION_002_PASSWORD_HASHING.sql`
3. Execute the query
4. Verify all passwords are now hashed

**Verification Query**:
```sql
SELECT
    email,
    CASE
        WHEN password_hash LIKE '$2%' THEN 'Hashed (bcrypt)'
        ELSE 'PLAIN TEXT - SECURITY RISK!'
    END as password_status
FROM public.users;
```

**Expected Output**: All passwords should show "Hashed (bcrypt)"

**⚠️ IMPORTANT**: Existing user passwords (admin123, intake123, etc.) will continue to work because they were hashed from their plain text values.

### Step 4: Run SQL Migration 003 - Auth Tables

**File**: `scripts/SECURITY_MIGRATION_003_AUTH_TABLES.sql`

1. In Supabase SQL Editor, create a new query
2. Copy and paste the entire contents of `SECURITY_MIGRATION_003_AUTH_TABLES.sql`
3. Execute the query
4. Verify new tables are created

**Verification Query**:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens')
ORDER BY table_name;
```

**Expected Output**: All 5 tables should be listed.

### Step 5: Configure Storage Bucket Policies

**Location**: Supabase Dashboard > Storage

For each storage bucket (`custom-capital-workflows`, `custom-capital-documents`, etc.):

1. Navigate to Storage > Policies
2. Create policy for service role:
   - **Name**: "Service role full access"
   - **Allowed operations**: SELECT, INSERT, UPDATE, DELETE
   - **Target roles**: service_role
   - **Policy definition**:
     ```sql
     (bucket_id = 'custom-capital-workflows')
     ```

3. Create policy for authenticated users:
   - **Name**: "Authenticated users read access"
   - **Allowed operations**: SELECT
   - **Target roles**: authenticated
   - **Policy definition**:
     ```sql
     (bucket_id = 'custom-capital-workflows')
     ```

### Step 6: Update Environment Variables

**File**: `.env.local` (create if it doesn't exist)

```bash
# Existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NEW: JWT Secret for session tokens
# Generate with: openssl rand -base64 32
JWT_SECRET=your_generated_secret_here_at_least_32_characters_long
```

**Generate JWT Secret**:
```bash
openssl rand -base64 32
```

### Step 7: Deploy Application Code

**Files Updated**:
- ✅ `lib/auth-utils.ts` (NEW)
- ✅ `lib/auth.ts` (UPDATED)
- ✅ `app/api/login/route.ts` (UPDATED)
- ✅ `app/api/save-workflow/route.ts` (UPDATED)

**Deployment Steps**:

1. Install dependencies:
   ```bash
   npm install jose
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Test locally:
   ```bash
   npm run dev
   ```

4. Verify login works with existing credentials (e.g., admin@customcapital.com / admin123)

5. Deploy to production:
   ```bash
   # Using Vercel
   vercel --prod

   # Or your deployment method
   ```

---

## Post-Migration Verification

### 1. Test Authentication

**Login Test**:
```bash
curl -X POST https://your-domain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@customcapital.com","password":"admin123"}'
```

**Expected Response**: `{"success":true,"user":{...}}`

### 2. Test Rate Limiting

Try logging in with wrong password 5+ times:

```bash
# This should fail after 5 attempts
for i in {1..6}; do
  curl -X POST https://your-domain.com/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@customcapital.com","password":"wrongpassword"}'
  echo "\nAttempt $i"
done
```

After 5 failed attempts, you should see: `{"error":"Too many login attempts..."}`

### 3. Verify RLS Policies

**Test Query** (in Supabase SQL Editor):
```sql
-- This should work (service role has access)
SELECT COUNT(*) FROM public.users;

-- Switch to anon role and try (should be blocked)
SET ROLE anon;
SELECT COUNT(*) FROM public.users;
-- Should return 0 or error

-- Reset role
RESET ROLE;
```

### 4. Check Audit Logs

```sql
SELECT
  action,
  user_id,
  resource_type,
  created_at,
  ip_address
FROM public.audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

You should see `USER_LOGIN` and `CREATE_APPLICATION` entries.

### 5. Verify Session Management

```sql
SELECT
  user_id,
  created_at,
  expires_at,
  is_active
FROM public.user_sessions
WHERE is_active = true
ORDER BY created_at DESC;
```

You should see active sessions for logged-in users.

---

## Rollback Procedures

### If Migration Fails

**Step 1: Restore Database Backup**
1. Go to Supabase Dashboard > Database > Backups
2. Select the backup created before migration
3. Click "Restore"

**Step 2: Disable RLS (Emergency Only)**
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_credit_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_agreements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporting_documents DISABLE ROW LEVEL SECURITY;
```

**Step 3: Revert Application Code**
```bash
git revert HEAD
git push origin main
# Redeploy
```

---

## Additional Security Measures

### 1. Force Password Reset for All Users

After migration, force all users to change passwords:

```sql
-- Create password reset tokens for all users
-- (Requires implementing password reset flow in application)
```

**Recommended**: Implement a password reset feature using the `password_reset_tokens` table.

### 2. Enable 2FA (Future Enhancement)

Consider implementing two-factor authentication:
- Time-based OTP (TOTP) using Google Authenticator
- SMS-based verification
- Email-based verification codes

### 3. Set Up Security Monitoring

**Create Alerts** in Supabase Dashboard:
- Failed login attempts > 10 per hour
- Account lockouts
- Unusual API usage patterns

### 4. Regular Security Audits

Schedule quarterly security reviews:
- [ ] Review audit logs for suspicious activity
- [ ] Check for inactive user accounts
- [ ] Verify RLS policies are still active
- [ ] Update dependencies
- [ ] Rotate JWT secret

### 5. Implement HTTPS Everywhere

Ensure all connections use HTTPS:
- [ ] Force HTTPS redirects
- [ ] Set `Strict-Transport-Security` header
- [ ] Use secure cookies only

### 6. Content Security Policy

Add CSP headers in `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

### 7. Database Connection Security

- [ ] Use connection pooling
- [ ] Enable SSL for database connections
- [ ] Rotate database credentials regularly
- [ ] Restrict database access to specific IP ranges

---

## Emergency Contacts

**If You Encounter Issues**:

1. **Check Application Logs**: Review server logs for errors
2. **Check Supabase Logs**: Database > Logs in Supabase Dashboard
3. **Check this Runbook**: Review rollback procedures
4. **Contact Support**: Create issue at project repository

---

## Migration Checklist

- [ ] Database backup created
- [ ] Migration 001 (RLS) executed successfully
- [ ] Migration 002 (Password Hashing) executed successfully
- [ ] Migration 003 (Auth Tables) executed successfully
- [ ] Storage bucket policies configured
- [ ] JWT_SECRET environment variable set
- [ ] `jose` npm package installed
- [ ] Application code deployed
- [ ] Login functionality tested
- [ ] Rate limiting tested
- [ ] RLS policies verified
- [ ] Audit logs confirmed working
- [ ] Session management verified
- [ ] Users notified of changes
- [ ] Documentation updated
- [ ] Security monitoring configured

---

## Success Criteria

✅ All tables have RLS enabled
✅ All passwords are bcrypt hashed
✅ JWT authentication working
✅ Rate limiting prevents brute force
✅ Account lockout after failed attempts
✅ Audit logs capture all security events
✅ Session management tracks active users
✅ No unauthorized access to data

---

## Next Steps After Migration

1. **Force password changes** for all existing users
2. **Implement 2FA** for admin accounts
3. **Set up security monitoring** alerts
4. **Schedule regular security audits**
5. **Implement password reset** functionality
6. **Add CSRF protection** for state-changing endpoints
7. **Implement role-based access control** (RBAC) for fine-grained permissions
8. **Set up automated security testing** in CI/CD pipeline

---

**Last Updated**: January 2026
**Version**: 1.0.0
