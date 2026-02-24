#!/bin/bash

# ============================================================================
# Security Testing Script
# ============================================================================
# This script tests the security improvements deployed to Custom Capital
# Workflows application.
#
# Usage: ./scripts/test-security.sh <base_url>
# Example: ./scripts/test-security.sh https://your-domain.com
# ============================================================================

set -e

BASE_URL="${1:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================================================"
echo "Security Testing for Custom Capital Workflows"
echo "Base URL: $BASE_URL"
echo "============================================================================"
echo ""

# ============================================================================
# Test 1: Authentication Required on Protected Endpoints
# ============================================================================
echo "Test 1: Checking authentication requirement on save-workflow endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/save-workflow" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@README.md" 2>&1 || echo "000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" == "401" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Endpoint requires authentication (401 Unauthorized)"
else
    echo -e "${RED}✗ FAIL${NC}: Endpoint should return 401, got $HTTP_CODE"
fi
echo ""

# ============================================================================
# Test 2: Rate Limiting on Login Endpoint
# ============================================================================
echo "Test 2: Testing rate limiting (max 5 failed attempts)..."
echo "Attempting 6 failed logins..."

RATE_LIMITED=false
for i in {1..6}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"wrongpassword'$i'"}' 2>&1)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    if echo "$BODY" | grep -q "Too many"; then
        RATE_LIMITED=true
        echo -e "${GREEN}✓ PASS${NC}: Rate limiting triggered on attempt $i"
        break
    fi
    echo "  Attempt $i: $HTTP_CODE"
done

if [ "$RATE_LIMITED" = false ]; then
    echo -e "${RED}✗ FAIL${NC}: Rate limiting did not trigger after 6 attempts"
else
    echo -e "${GREEN}✓ PASS${NC}: Rate limiting is working"
fi
echo ""

# ============================================================================
# Test 3: Valid Login Test
# ============================================================================
echo "Test 3: Testing valid login..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@customcapital.com","password":"admin123"}' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
    if echo "$BODY" | grep -q "success"; then
        echo -e "${GREEN}✓ PASS${NC}: Valid login successful"
        # Extract session token
        SESSION_TOKEN=$(echo "$BODY" | grep -o '"sessionToken":"[^"]*"' | cut -d'"' -f4 || echo "")
    else
        echo -e "${RED}✗ FAIL${NC}: Login returned 200 but no success field"
    fi
elif [ "$HTTP_CODE" == "423" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Account may be locked from previous tests. Wait 30 minutes."
else
    echo -e "${RED}✗ FAIL${NC}: Valid login failed with code $HTTP_CODE"
fi
echo ""

# ============================================================================
# Test 4: Invalid Credentials
# ============================================================================
echo "Test 4: Testing invalid credentials rejection..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@customcapital.com","password":"wrongpassword"}' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "423" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Invalid credentials properly rejected ($HTTP_CODE)"
else
    echo -e "${RED}✗ FAIL${NC}: Should return 401 or 423, got $HTTP_CODE"
fi
echo ""

# ============================================================================
# Test 5: Email Validation
# ============================================================================
echo "Test 5: Testing email format validation..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"test"}' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "400" ]; then
    if echo "$BODY" | grep -q -i "invalid.*email"; then
        echo -e "${GREEN}✓ PASS${NC}: Invalid email format rejected"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}: Returns 400 but message unclear"
    fi
else
    echo -e "${RED}✗ FAIL${NC}: Should return 400 for invalid email, got $HTTP_CODE"
fi
echo ""

# ============================================================================
# Test 6: Missing Credentials
# ============================================================================
echo "Test 6: Testing missing credentials handling..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "400" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Missing credentials properly rejected"
else
    echo -e "${RED}✗ FAIL${NC}: Should return 400, got $HTTP_CODE"
fi
echo ""

# ============================================================================
# Test 7: Session Token Format (if login succeeded)
# ============================================================================
if [ ! -z "$SESSION_TOKEN" ]; then
    echo "Test 7: Checking session token format..."
    # JWT tokens have 3 parts separated by dots
    DOT_COUNT=$(echo "$SESSION_TOKEN" | tr -cd '.' | wc -c)

    if [ "$DOT_COUNT" -eq 2 ]; then
        echo -e "${GREEN}✓ PASS${NC}: Session token appears to be a valid JWT"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}: Session token may not be JWT format (dots: $DOT_COUNT)"
    fi
else
    echo "Test 7: Skipped (no session token available)"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "============================================================================"
echo "Security Test Summary"
echo "============================================================================"
echo ""
echo -e "${GREEN}Completed Tests${NC}"
echo ""
echo "✓ Authentication enforcement"
echo "✓ Rate limiting"
echo "✓ Valid login handling"
echo "✓ Invalid credentials rejection"
echo "✓ Email validation"
echo "✓ Missing credentials handling"
echo "✓ Session token format"
echo ""
echo "============================================================================"
echo -e "${YELLOW}Note:${NC} For complete testing, also verify:"
echo "  - RLS policies in Supabase SQL Editor"
echo "  - Audit logs in database"
echo "  - Session tracking in user_sessions table"
echo "  - Password hashing in users table"
echo "============================================================================"
