# ============================================================================
# Security Testing Script (PowerShell)
# ============================================================================
# This script tests the security improvements deployed to Custom Capital
# Workflows application.
#
# Usage: .\scripts\test-security.ps1 -BaseUrl "https://your-domain.com"
# Example: .\scripts\test-security.ps1 -BaseUrl "http://localhost:3000"
# ============================================================================

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Security Testing for Custom Capital Workflows" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Test 1: Authentication Required on Protected Endpoints
# ============================================================================
Write-Host "Test 1: Checking authentication requirement on save-workflow endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/save-workflow" -Method Post -ErrorAction Stop
    Write-Host "✗ FAIL: Endpoint should return 401, got $($response.StatusCode)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✓ PASS: Endpoint requires authentication (401 Unauthorized)" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# Test 2: Rate Limiting on Login Endpoint
# ============================================================================
Write-Host "Test 2: Testing rate limiting (max 5 failed attempts)..." -ForegroundColor Yellow
Write-Host "Attempting 6 failed logins..." -ForegroundColor Gray

$rateLimited = $false
for ($i = 1; $i -le 6; $i++) {
    $body = @{
        email = "test@example.com"
        password = "wrongpassword$i"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/login" `
            -Method Post `
            -Body $body `
            -ContentType "application/json" `
            -ErrorAction Stop

        Write-Host "  Attempt $i: Success (unexpected)" -ForegroundColor Gray
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue

        if ($errorResponse.error -match "Too many") {
            $rateLimited = $true
            Write-Host "✓ PASS: Rate limiting triggered on attempt $i" -ForegroundColor Green
            break
        }
        Write-Host "  Attempt $i: Failed (expected)" -ForegroundColor Gray
    }
}

if (-not $rateLimited) {
    Write-Host "✗ FAIL: Rate limiting did not trigger after 6 attempts" -ForegroundColor Red
} else {
    Write-Host "✓ PASS: Rate limiting is working" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# Test 3: Valid Login Test
# ============================================================================
Write-Host "Test 3: Testing valid login..." -ForegroundColor Yellow

$loginBody = @{
    email = "admin@customcapital.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    if ($response.success) {
        Write-Host "✓ PASS: Valid login successful" -ForegroundColor Green
        $sessionToken = $response.sessionToken
    } else {
        Write-Host "✗ FAIL: Login returned success=false" -ForegroundColor Red
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 423) {
        Write-Host "⚠ WARNING: Account may be locked from previous tests. Wait 30 minutes." -ForegroundColor Yellow
    } else {
        Write-Host "✗ FAIL: Valid login failed with code $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# Test 4: Invalid Credentials
# ============================================================================
Write-Host "Test 4: Testing invalid credentials rejection..." -ForegroundColor Yellow

$invalidBody = @{
    email = "admin@customcapital.com"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/login" `
        -Method Post `
        -Body $invalidBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "✗ FAIL: Should reject invalid credentials" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401 -or $statusCode -eq 423) {
        Write-Host "✓ PASS: Invalid credentials properly rejected ($statusCode)" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: Should return 401 or 423, got $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# Test 5: Email Validation
# ============================================================================
Write-Host "Test 5: Testing email format validation..." -ForegroundColor Yellow

$invalidEmailBody = @{
    email = "notanemail"
    password = "test"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/login" `
        -Method Post `
        -Body $invalidEmailBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "✗ FAIL: Should reject invalid email format" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue

    if ($statusCode -eq 400 -and $errorMessage.error -match "email") {
        Write-Host "✓ PASS: Invalid email format rejected" -ForegroundColor Green
    } elseif ($statusCode -eq 400) {
        Write-Host "⚠ WARNING: Returns 400 but message unclear" -ForegroundColor Yellow
    } else {
        Write-Host "✗ FAIL: Should return 400 for invalid email, got $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# Test 6: Missing Credentials
# ============================================================================
Write-Host "Test 6: Testing missing credentials handling..." -ForegroundColor Yellow

$emptyBody = @{} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/login" `
        -Method Post `
        -Body $emptyBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "✗ FAIL: Should reject missing credentials" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✓ PASS: Missing credentials properly rejected" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL: Should return 400, got $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# ============================================================================
# Test 7: Session Token Format
# ============================================================================
if ($sessionToken) {
    Write-Host "Test 7: Checking session token format..." -ForegroundColor Yellow

    # JWT tokens have 3 parts separated by dots
    $dotCount = ($sessionToken.ToCharArray() | Where-Object { $_ -eq '.' }).Count

    if ($dotCount -eq 2) {
        Write-Host "✓ PASS: Session token appears to be a valid JWT" -ForegroundColor Green
    } else {
        Write-Host "⚠ WARNING: Session token may not be JWT format (dots: $dotCount)" -ForegroundColor Yellow
    }
} else {
    Write-Host "Test 7: Skipped (no session token available)" -ForegroundColor Gray
}
Write-Host ""

# ============================================================================
# Summary
# ============================================================================
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Security Test Summary" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Completed Tests:" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Authentication enforcement" -ForegroundColor White
Write-Host "✓ Rate limiting" -ForegroundColor White
Write-Host "✓ Valid login handling" -ForegroundColor White
Write-Host "✓ Invalid credentials rejection" -ForegroundColor White
Write-Host "✓ Email validation" -ForegroundColor White
Write-Host "✓ Missing credentials handling" -ForegroundColor White
Write-Host "✓ Session token format" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Note: For complete testing, also verify:" -ForegroundColor Yellow
Write-Host "  - RLS policies in Supabase SQL Editor" -ForegroundColor Gray
Write-Host "  - Audit logs in database" -ForegroundColor Gray
Write-Host "  - Session tracking in user_sessions table" -ForegroundColor Gray
Write-Host "  - Password hashing in users table" -ForegroundColor Gray
Write-Host "============================================================================" -ForegroundColor Cyan
