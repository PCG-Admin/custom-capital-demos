-- Add approval_data column to rental_credit_applications table
-- Run this in your Supabase SQL editor

ALTER TABLE rental_credit_applications
ADD COLUMN IF NOT EXISTS approval_data JSONB;

-- Add comment to document the column
COMMENT ON COLUMN rental_credit_applications.approval_data IS 'Stores the approval letter form data for future updates';
