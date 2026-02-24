CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom Capital Database Schema

-- Rental Credit Applications table
CREATE TABLE IF NOT EXISTS rental_credit_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_url TEXT,
  document_name TEXT NOT NULL,
  document_mime TEXT,
  document_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER DEFAULT 1,
  
  -- Extracted information from AI
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  business_name TEXT,
  rental_amount DECIMAL(10, 2),
  rental_term TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Workflow steps tracking
  step1_status TEXT DEFAULT 'pending', -- Rental Credit Application Review
  step1_notes TEXT,
  step1_completed_at TIMESTAMPTZ,
  step1_completed_by TEXT,
  
  step2_status TEXT DEFAULT 'pending', -- Credit Check
  step2_notes TEXT,
  step2_completed_at TIMESTAMPTZ,
  step2_completed_by TEXT,
  
  step3_status TEXT DEFAULT 'pending', -- Deal approval
  step3_notes TEXT,
  step3_completed_at TIMESTAMPTZ,
  step3_completed_by TEXT,
  
  step4_status TEXT DEFAULT 'pending', -- Credit Review
  step4_notes TEXT,
  step4_completed_at TIMESTAMPTZ,
  step4_completed_by TEXT,
  
  step5_status TEXT DEFAULT 'pending', -- Approval/Decline/Defer
  step5_decision TEXT, -- 'approved', 'declined', 'deferred'
  step5_notes TEXT,
  step5_completed_at TIMESTAMPTZ,
  step5_completed_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  generated_agreement_url TEXT,
  generated_agreement_name TEXT,
  generated_agreement_number TEXT,
  generated_agreement_created_at TIMESTAMPTZ
);

-- Rental Agreements table
CREATE TABLE IF NOT EXISTS rental_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_url TEXT,
  document_name TEXT NOT NULL,
  document_mime TEXT,
  document_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER DEFAULT 1,
  
  -- Extracted information from AI
  agreement_number TEXT,
  lessee_name TEXT,
  lessor_name TEXT,
  rental_amount DECIMAL(10, 2),
  start_date DATE,
  end_date DATE,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Workflow steps tracking
  step1_status TEXT DEFAULT 'pending', -- Rental agreement check
  step1_notes TEXT,
  step1_completed_at TIMESTAMPTZ,
  step1_completed_by TEXT,
  
  step2_status TEXT DEFAULT 'pending', -- Review Docs
  step2_notes TEXT,
  step2_completed_at TIMESTAMPTZ,
  step2_completed_by TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table for workflow assignments and basic authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  responsible_workflow TEXT NOT NULL,
  responsible_step TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Supporting documents table
CREATE TABLE IF NOT EXISTS supporting_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES rental_credit_applications(id) ON DELETE CASCADE,
  agreement_id UUID REFERENCES rental_agreements(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_status ON rental_credit_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON rental_credit_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON rental_agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_created ON rental_agreements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supporting_docs_application ON supporting_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_supporting_docs_agreement ON supporting_documents(agreement_id);
CREATE INDEX IF NOT EXISTS idx_users_workflow ON users(responsible_workflow);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
