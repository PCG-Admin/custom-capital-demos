# Security Deployment Checklist

Use this checklist to ensure all security upgrades are deployed correctly.

## Pre-Deployment

- [x] **Code Changes**: All security code changes committed
- [x] **Dependencies**: `jose` package added to package.json
- [x] **Environment Variables**: JWT_SECRET added to .env.local
- [ ] **Database Backup**: Create Supabase database backup

## Installation (Automated)

Run the installation script:

**Windows (PowerShell)**:
```powershell
.\scripts\install-dependencies.ps1
```

**Linux/Mac (Bash)**:
```bash
chmod +x scripts/install-dependencies.sh
./scripts/install-dependencies.sh
```

Manual installation:
- [ ] Run: `npm install jose`
- [ ] Verify JWT_SECRET in .env.local
- [ ] Run: `npm run build`

## Database Migrations

**IMPORTANT**: Run these in Supabase SQL Editor in exact order!

### Migration 1: Enable RLS
- [ ] Open Supabase Dashboard > SQL Editor
- [ ] Create new query
- [ ] Copy contents of `scripts/SECURITY_MIGRATION_001_ENABLE_RLS.sql`
- [ ] Execute query
- [ ] Verify RLS enabled:
  ```sql
  SELECT tablename, relrowsecurity
  FROM pg_tables pt
  JOIN pg_class pc ON pc.oid = ('public.' || pt.tablename)::regclass
  WHERE schemaname = 'public'
  AND tablename IN ('users', 'suppliers', 'rental_credit_applications', 'rental_agreements', 'supporting_documents');
  ```
- [ ] All tables should show `relrowsecurity = true`

### Migration 2: Password Hashing
- [ ] Open Supabase Dashboard > SQL Editor
- [ ] Create new query
- [ ] Copy contents of `scripts/SECURITY_MIGRATION_002_PASSWORD_HASHING.sql`
- [ ] Execute query
- [ ] Verify passwords hashed:
  ```sql
  SELECT email,
    CASE
      WHEN password_hash LIKE '$2%' THEN 'Hashed'
      ELSE 'PLAIN TEXT'
    END as status
  FROM users;
  ```
- [ ] All passwords should show `status = 'Hashed'`

### Migration 3: Auth Tables
- [ ] Open Supabase Dashboard > SQL Editor
- [ ] Create new query
- [ ] Copy contents of `scripts/SECURITY_MIGRATION_003_AUTH_TABLES.sql`
- [ ] Execute query
- [ ] Verify tables created:
  ```sql
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens')
  ORDER BY table_name;
  ```
- [ ] All 5 tables should be listed

## Storage Bucket Policies

Configure in Supabase Dashboard > Storage:

- [ ] Navigate to Storage > Policies
- [ ] For bucket `custom-capital-workflows`:
  - [ ] Create "Service role full access" policy
  - [ ] Create "Authenticated users read access" policy

## Application Deployment

### Local Testing
- [ ] Run: `npm run dev`
- [ ] Test login at http://localhost:3000
  - Email: `admin@customcapital.com`
  - Password: `admin123`
- [ ] Verify successful login
- [ ] Verify navigation works
- [ ] Test logout
- [ ] Run security tests:
  ```powershell
  .\scripts\test-security.ps1 -BaseUrl "http://localhost:3000"
  ```

### Production Deployment
- [ ] Verify all local tests pass
- [ ] Deploy to production (Vercel/other):
  ```bash
  # Using Vercel
  vercel --prod

  # Or your deployment method
  npm run build && npm start
  ```
- [ ] Verify production environment variables are set
- [ ] Run security tests against production:
  ```powershell
  .\scripts\test-security.ps1 -BaseUrl "https://your-domain.com"
  ```

## Post-Deployment Verification

### Functional Tests
- [ ] Login with existing credentials works
- [ ] Failed login attempts are rate limited
- [ ] Account locks after 5 failed attempts
- [ ] Session persists across page refreshes
- [ ] Logout clears session properly

### Security Tests
- [ ] Run automated security test suite
- [ ] Verify RLS prevents unauthorized data access
- [ ] Check audit logs are populating:
  ```sql
  SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
  ```
- [ ] Check login attempts are logged:
  ```sql
  SELECT * FROM login_attempts ORDER BY attempted_at DESC LIMIT 10;
  ```
- [ ] Verify sessions are tracked:
  ```sql
  SELECT * FROM user_sessions WHERE is_active = true ORDER BY created_at DESC;
  ```

### Database Verification
- [ ] RLS enabled on all tables:
  ```sql
  SELECT tablename, relrowsecurity as rls_enabled
  FROM pg_tables pt
  JOIN pg_class pc ON pc.oid = ('public.' || pt.tablename)::regclass
  WHERE schemaname = 'public'
  AND tablename IN ('users', 'suppliers', 'rental_credit_applications', 'rental_agreements', 'supporting_documents');
  ```
- [ ] Passwords are bcrypt hashed:
  ```sql
  SELECT COUNT(*) as hashed_count
  FROM users
  WHERE password_hash LIKE '$2%';
  ```
- [ ] Auth tables exist and have RLS:
  ```sql
  SELECT table_name, row_security
  FROM information_schema.tables t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  WHERE table_schema = 'public'
  AND table_name IN ('user_sessions', 'login_attempts', 'account_lockouts', 'audit_logs', 'password_reset_tokens');
  ```

## Security Validation

### Penetration Testing
- [ ] **Test 1**: Attempt to access protected endpoint without authentication
  - Expected: 401 Unauthorized
- [ ] **Test 2**: Attempt brute force login (6+ attempts)
  - Expected: Rate limiting kicks in
- [ ] **Test 3**: Try to access data via Supabase anon key
  - Expected: RLS blocks unauthorized access
- [ ] **Test 4**: Verify JWT tokens are properly signed
  - Expected: Invalid tokens rejected
- [ ] **Test 5**: Test session invalidation on logout
  - Expected: Old session tokens no longer work

### Audit Trail
- [ ] Login events logged in `audit_logs`
- [ ] Failed login attempts in `login_attempts`
- [ ] Workflow creation logged
- [ ] Account lockouts tracked

## Monitoring Setup

- [ ] Set up alerts for:
  - [ ] Failed login attempts > 10/hour
  - [ ] Account lockouts
  - [ ] Unusual API usage
- [ ] Configure log retention:
  - [ ] Audit logs: 1 year
  - [ ] Login attempts: 90 days
  - [ ] Sessions: 7 days after inactive

## User Communication

- [ ] Notify users of security upgrade (optional)
- [ ] Inform about password requirements for new users
- [ ] Update documentation with new security features

## Rollback Plan

If issues occur:

### Application Rollback
- [ ] Revert to previous Git commit
- [ ] Redeploy previous version
- [ ] Verify application works

### Database Rollback
- [ ] Restore from backup in Supabase Dashboard
- [ ] OR disable RLS temporarily:
  ```sql
  ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.suppliers DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.rental_credit_applications DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.rental_agreements DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.supporting_documents DISABLE ROW LEVEL SECURITY;
  ```

## Success Criteria

✅ All migrations executed successfully
✅ RLS enabled on all tables
✅ Passwords bcrypt hashed
✅ JWT authentication working
✅ Rate limiting active
✅ Audit logging functional
✅ Security tests passing
✅ No errors in production logs
✅ Users can login and use application

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error logs for 24 hours
- [ ] Check audit logs for anomalies
- [ ] Verify no user complaints
- [ ] Test all major workflows

### Short Term (Week 1)
- [ ] Review security metrics
- [ ] Check for locked accounts
- [ ] Analyze login patterns
- [ ] Update any issues found

### Medium Term (Month 1)
- [ ] Review audit logs for suspicious activity
- [ ] Analyze rate limiting effectiveness
- [ ] Consider implementing 2FA
- [ ] Plan password reset feature

### Long Term (Quarterly)
- [ ] Security audit review
- [ ] Rotate JWT secret
- [ ] Update dependencies
- [ ] Penetration testing

## Documentation Updates

- [ ] Update README.md with security features
- [ ] Document new password requirements
- [ ] Update deployment documentation
- [ ] Create runbook for common security issues

## Compliance

- [ ] GDPR: Data access controls verified
- [ ] CCPA: Audit trail complete
- [ ] SOC 2: Security controls documented
- [ ] PCI DSS: Password security compliant

---

## Quick Reference

**Test Login Credentials**:
- Email: `admin@customcapital.com`
- Password: `admin123`

**Common Queries**:

Check RLS status:
```sql
SELECT tablename, relrowsecurity FROM pg_tables pt
JOIN pg_class pc ON pc.oid = ('public.' || pt.tablename)::regclass
WHERE schemaname = 'public';
```

View recent logins:
```sql
SELECT u.email, l.attempted_at, l.success, l.ip_address
FROM login_attempts l
JOIN users u ON u.email = l.email
ORDER BY l.attempted_at DESC LIMIT 20;
```

Active sessions:
```sql
SELECT u.email, s.created_at, s.last_activity_at
FROM user_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.is_active = true;
```

---

**Deployment Status**: ⏳ In Progress

**Completed Steps**:
- ✅ Code changes
- ✅ Dependencies added
- ✅ Environment variables configured
- ⏳ Database migrations (pending)
- ⏳ Testing (pending)
- ⏳ Production deployment (pending)

---

**Need Help?**
- Review: [SECURITY_QUICKSTART.md](SECURITY_QUICKSTART.md)
- Detailed Guide: [scripts/SECURITY_MIGRATION_RUNBOOK.md](scripts/SECURITY_MIGRATION_RUNBOOK.md)
- Audit Report: [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)

**Last Updated**: January 25, 2026
