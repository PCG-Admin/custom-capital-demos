-- Migration: Add credit capture fields for step 2 (Credit Check) on rental credit applications

-- Add structured credit metadata captured during step 2
ALTER TABLE rental_credit_applications
  ADD COLUMN IF NOT EXISTS credit_score INTEGER,
  ADD COLUMN IF NOT EXISTS credit_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credit_notes TEXT,
  ADD COLUMN IF NOT EXISTS credit_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credit_checked_by TEXT;

-- Optional: index credit_score for simple filtering/reporting
CREATE INDEX IF NOT EXISTS idx_applications_credit_score
  ON rental_credit_applications(credit_score);
