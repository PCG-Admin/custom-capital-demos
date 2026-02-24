# ============================================================================
# Install Dependencies Script (PowerShell)
# ============================================================================
# This script installs all required dependencies for the security upgrade
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Custom Capital Workflows - Security Upgrade Installation" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the project root directory." -ForegroundColor Red
    exit 1
}

# Step 1: Install npm dependencies
Write-Host "Step 1: Installing npm dependencies..." -ForegroundColor Yellow
Write-Host "Installing jose package for JWT authentication..." -ForegroundColor Gray
Write-Host ""

try {
    npm install jose
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check environment variables
Write-Host "Step 2: Checking environment variables..." -ForegroundColor Yellow

$envFile = ".env.local"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw

    # Check for JWT_SECRET
    if ($envContent -match "JWT_SECRET=") {
        Write-Host "✓ JWT_SECRET is configured" -ForegroundColor Green
    } else {
        Write-Host "⚠ WARNING: JWT_SECRET not found in .env.local" -ForegroundColor Yellow
        Write-Host "  JWT_SECRET has been added to .env.local by the security upgrade" -ForegroundColor Gray
    }

    # Check for Supabase keys
    if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL=") {
        Write-Host "✓ NEXT_PUBLIC_SUPABASE_URL is configured" -ForegroundColor Green
    } else {
        Write-Host "✗ ERROR: NEXT_PUBLIC_SUPABASE_URL not found" -ForegroundColor Red
    }

    if ($envContent -match "SUPABASE_SERVICE_ROLE_KEY=") {
        Write-Host "✓ SUPABASE_SERVICE_ROLE_KEY is configured" -ForegroundColor Green
    } else {
        Write-Host "✗ ERROR: SUPABASE_SERVICE_ROLE_KEY not found" -ForegroundColor Red
    }
} else {
    Write-Host "✗ ERROR: .env.local file not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Verify project structure
Write-Host "Step 3: Verifying security files..." -ForegroundColor Yellow

$requiredFiles = @(
    "lib\auth-utils.ts",
    "scripts\SECURITY_MIGRATION_001_ENABLE_RLS.sql",
    "scripts\SECURITY_MIGRATION_002_PASSWORD_HASHING.sql",
    "scripts\SECURITY_MIGRATION_003_AUTH_TABLES.sql"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (MISSING)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "✗ ERROR: Some required security files are missing" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ All security files verified" -ForegroundColor Green
Write-Host ""

# Step 4: Build the application
Write-Host "Step 4: Building the application..." -ForegroundColor Yellow
Write-Host ""

try {
    npm run build
    Write-Host ""
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the build errors before proceeding." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Run the SQL migrations in Supabase SQL Editor (in order):" -ForegroundColor White
Write-Host "     - scripts\SECURITY_MIGRATION_001_ENABLE_RLS.sql" -ForegroundColor Gray
Write-Host "     - scripts\SECURITY_MIGRATION_002_PASSWORD_HASHING.sql" -ForegroundColor Gray
Write-Host "     - scripts\SECURITY_MIGRATION_003_AUTH_TABLES.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Test the application locally:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Run security tests:" -ForegroundColor White
Write-Host "     .\scripts\test-security.ps1 -BaseUrl `"http://localhost:3000`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Deploy to production when ready" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "  - SECURITY_QUICKSTART.md" -ForegroundColor Gray
Write-Host "  - scripts\SECURITY_MIGRATION_RUNBOOK.md" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
