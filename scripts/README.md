# Security Migration Scripts

This directory contains all SQL migration scripts and testing tools for securing the Custom Capital Workflows application.

## 📁 Files Overview

### SQL Migration Scripts (Run in order)

1. **`SECURITY_MIGRATION_001_ENABLE_RLS.sql`**
   - Enables Row Level Security on all public tables
   - Creates RLS policies for data protection
   - Execution time: ~2 minutes
   - **Status**: Ready to deploy

2. **`SECURITY_MIGRATION_002_PASSWORD_HASHING.sql`**
   - Implements bcrypt password hashing
   - Creates password management functions
   - Hashes existing plain text passwords
   - Execution time: ~3 minutes
   - **Status**: Ready to deploy

3. **`SECURITY_MIGRATION_003_AUTH_TABLES.sql`**
   - Creates authentication infrastructure tables
   - Sets up session management
   - Implements rate limiting and audit logging
   - Execution time: ~2 minutes
   - **Status**: Ready to deploy

### Existing Scripts

4. **`001_create_tables.sql`**
   - Original schema creation script
   - **Note**: Does NOT include security features

5. **`002_insert_sample_data.sql`**
   - Sample data with plain text passwords
   - **Warning**: Passwords will be hashed after migration

### Documentation

6. **`SECURITY_MIGRATION_RUNBOOK.md`**
   - Complete step-by-step deployment guide
   - Verification procedures
   - Rollback instructions
   - Troubleshooting guide

### Testing Scripts

7. **`test-security.sh`** (Linux/Mac)
   - Automated security testing script
   - Tests authentication, rate limiting, etc.
   - Usage: `./test-security.sh http://localhost:3000`

8. **`test-security.ps1`** (Windows)
   - PowerShell version of security tests
   - Usage: `.\test-security.ps1 -BaseUrl "http://localhost:3000"`

## 🚀 Quick Start

### 1. Backup Database
```sql
-- Create backup in Supabase Dashboard > Database > Backups
```

### 2. Run Migrations (in Supabase SQL Editor)

**Copy and paste each file's contents into SQL Editor and execute:**

```sql
-- Step 1: Enable RLS
-- Paste contents of SECURITY_MIGRATION_001_ENABLE_RLS.sql
-- Execute ▶️

-- Step 2: Implement Password Hashing
-- Paste contents of SECURITY_MIGRATION_002_PASSWORD_HASHING.sql
-- Execute ▶️

-- Step 3: Create Auth Tables
-- Paste contents of SECURITY_MIGRATION_003_AUTH_TABLES.sql
-- Execute ▶️
```

### 3. Verify Migrations

```sql
-- Check RLS status
SELECT tablename, relrowsecurity as rls_enabled
FROM pg_tables pt
JOIN pg_class pc ON pc.oid = ('public.' || pt.tablename)::regclass
WHERE schemaname = 'public'
AND tablename IN ('users', 'suppliers', 'rental_credit_applications', 'rental_agreements', 'supporting_documents');

-- Check password hashing
SELECT email,
  CASE
    WHEN password_hash LIKE '$2%' THEN 'Hashed'
    ELSE 'Plain Text'
  END as status
FROM users;

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens');
```

### 4. Test Security

**Windows:**
```powershell
.\scripts\test-security.ps1 -BaseUrl "http://localhost:3000"
```

**Linux/Mac:**
```bash
chmod +x scripts/test-security.sh
./scripts/test-security.sh http://localhost:3000
```

## 📊 Migration Order Diagram

```
┌─────────────────────────────────────┐
│  1. SECURITY_MIGRATION_001_ENABLE_RLS.sql
│     └─ Enables RLS on all tables   │
│     └─ Creates security policies   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  2. SECURITY_MIGRATION_002_PASSWORD_HASHING.sql
│     └─ Hashes existing passwords   │
│     └─ Creates password functions  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  3. SECURITY_MIGRATION_003_AUTH_TABLES.sql
│     └─ Creates auth tables         │
│     └─ Sets up rate limiting       │
│     └─ Implements audit logging    │
└─────────────────────────────────────┘
```

## ⚠️ Important Notes

### Before Migration
- ✅ Create database backup
- ✅ Test in staging environment first
- ✅ Review all migration scripts
- ✅ Plan maintenance window

### During Migration
- 🔴 Run migrations in exact order (001 → 002 → 003)
- 🔴 Do NOT skip any migration
- 🔴 Wait for each migration to complete before running next
- 🔴 Verify each migration with provided queries

### After Migration
- ✅ Existing passwords still work (admin123, intake123, etc.)
- ✅ Run security tests
- ✅ Monitor error logs
- ✅ Verify RLS is enabled
- ✅ Check audit logs are populating

## 🔧 Database Functions Created

### Password Management
```sql
-- Hash a password
SELECT hash_password('MyPassword123!');

-- Verify a password
SELECT verify_password('MyPassword123!', hashed_password);

-- Create user with hashed password
SELECT create_user(
  'John Doe',
  'john@example.com',
  'SecurePassword123!',
  'Credit Analyst',
  'rental_credit_application',
  'Credit Check'
);

-- Update password
SELECT update_user_password(
  user_id,
  'OldPassword123!',
  'NewPassword123!'
);
```

### Rate Limiting & Security
```sql
-- Check if rate limited
SELECT check_rate_limit('user@example.com', '192.168.1.1');

-- Record login attempt
SELECT record_login_attempt(
  'user@example.com',
  '192.168.1.1',
  'Mozilla/5.0',
  true,  -- success
  null   -- failure reason
);

-- Check if account is locked
SELECT is_account_locked(user_id);

-- Lock account
SELECT lock_account(user_id, 30, 'Too many failed attempts');

-- Unlock account
SELECT unlock_account(user_id);
```

### Audit Logging
```sql
-- Create audit log
SELECT create_audit_log(
  user_id,
  'USER_LOGIN',
  'user',
  user_id,
  null,  -- old values
  null,  -- new values
  '192.168.1.1',
  'Mozilla/5.0'
);

-- View recent audit logs
SELECT * FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Maintenance
```sql
-- Clean up expired sessions
SELECT cleanup_expired_sessions();

-- Clean up old login attempts (90+ days)
SELECT cleanup_old_login_attempts();
```

## 📈 Verification Queries

### Check Migration Status
```sql
-- 1. Verify RLS is enabled
SELECT
  tablename,
  relrowsecurity as rls_enabled,
  COUNT(pol.policyname) as policy_count
FROM pg_tables pt
JOIN pg_class pc ON pc.oid = ('public.' || pt.tablename)::regclass
LEFT JOIN pg_policies pol ON pol.tablename = pt.tablename
WHERE pt.schemaname = 'public'
AND pt.tablename IN ('users', 'suppliers', 'rental_credit_applications', 'rental_agreements', 'supporting_documents')
GROUP BY tablename, relrowsecurity;

-- 2. Verify password hashing
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN password_hash LIKE '$2%' THEN 1 END) as hashed_passwords,
  COUNT(CASE WHEN password_hash NOT LIKE '$2%' THEN 1 END) as plain_text_passwords
FROM users;

-- 3. Verify auth tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens')
ORDER BY table_name;

-- 4. Verify functions exist
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'hash_password',
  'verify_password',
  'create_user',
  'update_user_password',
  'check_rate_limit',
  'is_account_locked',
  'lock_account',
  'unlock_account',
  'record_login_attempt',
  'create_audit_log'
)
ORDER BY routine_name;
```

## 🔄 Rollback Procedures

### Emergency Rollback

If something goes wrong, you can restore from backup:

1. **Restore from Backup** (Supabase Dashboard)
   - Go to Database > Backups
   - Select backup created before migration
   - Click "Restore"

2. **Disable RLS** (Emergency only - NOT recommended)
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_credit_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_agreements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporting_documents DISABLE ROW LEVEL SECURITY;
```

3. **Drop Auth Tables** (If migration 003 failed)
```sql
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.account_lockouts CASCADE;
DROP TABLE IF EXISTS public.login_attempts CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
```

## 📞 Support

**Issues during migration?**
1. Check the error message in Supabase SQL Editor
2. Review `SECURITY_MIGRATION_RUNBOOK.md` for troubleshooting
3. Check Supabase logs: Database > Logs
4. Verify environment variables are set correctly
5. Ensure you're using service role key, not anon key

**Common Issues:**
- **"Permission denied"**: Use service role key in SQL Editor settings
- **"Function already exists"**: Safe to ignore or drop and recreate
- **"Table already exists"**: Migration was partially completed, safe to continue
- **"RLS policy exists"**: Drop existing policies first

## 📚 Additional Resources

- **Full Documentation**: See [SECURITY_AUDIT_REPORT.md](../SECURITY_AUDIT_REPORT.md)
- **Quick Start**: See [SECURITY_QUICKSTART.md](../SECURITY_QUICKSTART.md)
- **Detailed Guide**: See [SECURITY_MIGRATION_RUNBOOK.md](SECURITY_MIGRATION_RUNBOOK.md)

---

**Migration Version**: 1.0.0
**Last Updated**: January 25, 2026
**Status**: ✅ Ready for Production
