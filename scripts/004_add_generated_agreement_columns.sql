-- Migration: add generated rental agreement metadata to applications

ALTER TABLE rental_credit_applications
  ADD COLUMN IF NOT EXISTS generated_agreement_url TEXT,
  ADD COLUMN IF NOT EXISTS generated_agreement_name TEXT,
  ADD COLUMN IF NOT EXISTS generated_agreement_number TEXT,
  ADD COLUMN IF NOT EXISTS generated_agreement_created_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_applications_generated_agreement
  ON rental_credit_applications(generated_agreement_created_at);
