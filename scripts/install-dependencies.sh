#!/bin/bash

# ============================================================================
# Install Dependencies Script (Bash)
# ============================================================================
# This script installs all required dependencies for the security upgrade
# ============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================================================${NC}"
echo -e "${CYAN}Custom Capital Workflows - Security Upgrade Installation${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

# Step 1: Install npm dependencies
echo -e "${YELLOW}Step 1: Installing npm dependencies...${NC}"
echo -e "${GRAY}Installing jose package for JWT authentication...${NC}"
echo ""

if npm install jose; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""

# Step 2: Check environment variables
echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"

ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    # Check for JWT_SECRET
    if grep -q "JWT_SECRET=" "$ENV_FILE"; then
        echo -e "${GREEN}✓ JWT_SECRET is configured${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING: JWT_SECRET not found in .env.local${NC}"
        echo -e "${GRAY}  JWT_SECRET has been added to .env.local by the security upgrade${NC}"
    fi

    # Check for Supabase keys
    if grep -q "NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE"; then
        echo -e "${GREEN}✓ NEXT_PUBLIC_SUPABASE_URL is configured${NC}"
    else
        echo -e "${RED}✗ ERROR: NEXT_PUBLIC_SUPABASE_URL not found${NC}"
    fi

    if grep -q "SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE"; then
        echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY is configured${NC}"
    else
        echo -e "${RED}✗ ERROR: SUPABASE_SERVICE_ROLE_KEY not found${NC}"
    fi
else
    echo -e "${RED}✗ ERROR: .env.local file not found${NC}"
    exit 1
fi

echo ""

# Step 3: Verify project structure
echo -e "${YELLOW}Step 3: Verifying security files...${NC}"

REQUIRED_FILES=(
    "lib/auth-utils.ts"
    "scripts/SECURITY_MIGRATION_001_ENABLE_RLS.sql"
    "scripts/SECURITY_MIGRATION_002_PASSWORD_HASHING.sql"
    "scripts/SECURITY_MIGRATION_003_AUTH_TABLES.sql"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓ $file${NC}"
    else
        echo -e "  ${RED}✗ $file (MISSING)${NC}"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
    echo ""
    echo -e "${RED}✗ ERROR: Some required security files are missing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ All security files verified${NC}"
echo ""

# Step 4: Build the application
echo -e "${YELLOW}Step 4: Building the application...${NC}"
echo ""

if npm run build; then
    echo ""
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    echo ""
    echo -e "${YELLOW}Please fix the build errors before proceeding.${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}============================================================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${CYAN}============================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  ${NC}1. Run the SQL migrations in Supabase SQL Editor (in order):${NC}"
echo -e "     ${GRAY}- scripts/SECURITY_MIGRATION_001_ENABLE_RLS.sql${NC}"
echo -e "     ${GRAY}- scripts/SECURITY_MIGRATION_002_PASSWORD_HASHING.sql${NC}"
echo -e "     ${GRAY}- scripts/SECURITY_MIGRATION_003_AUTH_TABLES.sql${NC}"
echo ""
echo -e "  ${NC}2. Test the application locally:${NC}"
echo -e "     ${GRAY}npm run dev${NC}"
echo ""
echo -e "  ${NC}3. Run security tests:${NC}"
echo -e "     ${GRAY}./scripts/test-security.sh http://localhost:3000${NC}"
echo ""
echo -e "  ${NC}4. Deploy to production when ready${NC}"
echo ""
echo -e "${YELLOW}For detailed instructions, see:${NC}"
echo -e "  ${GRAY}- SECURITY_QUICKSTART.md${NC}"
echo -e "  ${GRAY}- scripts/SECURITY_MIGRATION_RUNBOOK.md${NC}"
echo ""
echo -e "${CYAN}============================================================================${NC}"
