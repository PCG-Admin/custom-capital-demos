-- Migration 005: Supplier Template Management
-- Purpose: Add suppliers table and link to applications for improved AI extraction

-- Create suppliers table for template management
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sample_pdf_url TEXT,
  sample_pdf_name TEXT,
  sample_extraction JSONB,  -- Reference extraction from sample PDF, used as few-shot example
  field_hints JSONB,  -- Known field locations and patterns specific to this supplier
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add supplier reference to rental credit applications
ALTER TABLE rental_credit_applications
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_applications_supplier ON rental_credit_applications(supplier_id);

-- Add table and column comments for documentation
COMMENT ON TABLE suppliers IS 'Stores supplier information and sample PDFs for improved AI extraction accuracy';
COMMENT ON COLUMN suppliers.name IS 'Unique supplier name (e.g., "Acme Rentals", "Best Properties")';
COMMENT ON COLUMN suppliers.description IS 'Optional description of the supplier';
COMMENT ON COLUMN suppliers.sample_pdf_url IS 'URL to sample PDF stored in Supabase storage';
COMMENT ON COLUMN suppliers.sample_pdf_name IS 'Original filename of the sample PDF';
COMMENT ON COLUMN suppliers.sample_extraction IS 'JSON extracted from sample PDF, used as few-shot example for AI';
COMMENT ON COLUMN suppliers.field_hints IS 'Supplier-specific field locations and patterns to improve extraction';
COMMENT ON COLUMN suppliers.is_active IS 'Whether this supplier is active (soft delete flag)';
COMMENT ON COLUMN rental_credit_applications.supplier_id IS 'Reference to supplier if known, NULL for unknown suppliers';

-- Insert example supplier (optional - can be removed after testing)
INSERT INTO suppliers (name, description, is_active)
VALUES ('Unknown/Other', 'Default option for applications from unknown suppliers', true)
ON CONFLICT (name) DO NOTHING;
