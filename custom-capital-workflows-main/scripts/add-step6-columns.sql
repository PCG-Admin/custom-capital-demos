-- Add Step 6 columns to rental_credit_applications table
ALTER TABLE rental_credit_applications
ADD COLUMN IF NOT EXISTS step6_status TEXT,
ADD COLUMN IF NOT EXISTS step6_notes TEXT,
ADD COLUMN IF NOT EXISTS step6_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS step6_completed_by TEXT,
ADD COLUMN IF NOT EXISTS step6_decision TEXT;

COMMENT ON COLUMN rental_credit_applications.step6_status IS 'Status of Step 6: Document Generation';
COMMENT ON COLUMN rental_credit_applications.step6_notes IS 'Notes for Step 6';
COMMENT ON COLUMN rental_credit_applications.step6_completed_at IS 'Timestamp when Step 6 was completed';
COMMENT ON COLUMN rental_credit_applications.step6_completed_by IS 'User who completed Step 6';
COMMENT ON COLUMN rental_credit_applications.step6_decision IS 'Decision for Step 6 (if applicable)';
