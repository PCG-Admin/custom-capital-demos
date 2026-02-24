# Supplier Template System - Complete Flow

## Toast Messages Fixed ✅
All toast messages now have solid white backgrounds for readability:
- Success messages: White background with gray border
- Error messages: Light red background with red border

## How Supplier Templates Work

### 1. Upload Flow (Already Working)

```
User uploads credit application
     ↓
1. Select supplier from dropdown (components/upload-application.tsx:80-82)
2. Upload sends supplierId to /api/upload-document
3. API passes supplierId to extractDocumentData() (app/api/upload-document/route.ts:57)
4. AI extraction uses supplier template:
   a. Fetches supplier.field_hints
   b. Builds custom prompt with ONLY enabled fields
   c. Uses supplier.sample_extraction as few-shot example
   d. Returns extracted data
```

### 2. Template Configuration

**Admin Setup:**
1. Go to Settings → Suppliers
2. Click upload icon for a supplier
3. Upload sample PDF → Auto-extraction happens
4. **Field Selection Dialog opens automatically**
5. Configure which fields this supplier uses:
   - Check/uncheck fields
   - Mark critical fields (highlighted on forms)
   - Add field notes
6. Click "Save Template"

### 3. What Makes Templates Different

Each supplier template stores:

```json
{
  "enabled_fields": ["businessName", "rentalAmount", "settlement", ...],
  "critical_fields": ["settlement", "escalation"],
  "field_notes": {
    "settlement": "Usually in red box at top right",
    "escalation": "Marked with asterisk"
  }
}
```

**Example:**
- **Supplier A** might only have: businessName, rentalAmount, term (3 fields)
- **Supplier B** might have: all banking fields + equipment details (25 fields)
- **Supplier C** might have: full financial data + addresses (45 fields)

### 4. How AI Uses Templates

When extracting a document with supplier selected:

**Without Template (Generic):**
```
Extract ALL 70+ fields → Many N/A values → Less accurate
```

**With Template:**
```
Extract ONLY enabled fields for this supplier
Emphasize critical fields
Use sample_extraction as reference
→ Focused extraction → Higher accuracy
```

### 5. Custom Prompt Example

For Supplier A with only 3 fields enabled:

```
You are an expert at analyzing rental credit application documents.
Extract ONLY the following fields:

CRITICAL FIELDS (often highlighted in red/pink):
- settlement: Settlement amount payable to supplier - Usually in red box at top right
- escalation: Annual escalation percentage - Marked with asterisk

COMPANY INFORMATION:
- businessName: Legal/trading name of the business

FINANCIAL DETAILS:
- rentalAmount: Total rental amount

[Extraction rules...]

SUPPLIER-SPECIFIC CONTEXT:
This document is from supplier: Supplier A

Here is a reference extraction from a previous Supplier A application:
{
  "businessName": "ABC Company",
  "rentalAmount": "5000",
  "settlement": "100000",
  "escalation": "10%"
}

Pay attention to field locations commonly used by Supplier A...
```

## Verification Steps

### Test Different Templates:

1. **Create Supplier "Basic Forms"**
   - Upload sample with minimal fields
   - Select only: businessName, rentalAmount, term, supplierName
   - Save template

2. **Create Supplier "Full Forms"**
   - Upload sample with all fields
   - Select all financial + banking + equipment fields
   - Mark settlement, escalation as critical
   - Save template

3. **Create Supplier "Financial Focus"**
   - Upload sample focused on finances
   - Select: all financial fields + registration + VAT
   - Mark rentalExclVat, settlement, escalation as critical
   - Add notes for highlighted fields

4. **Test Extraction**
   - Upload application from "Basic Forms" → Should only extract 4 fields
   - Upload application from "Full Forms" → Should extract 40+ fields
   - Upload application from "Financial Focus" → Should extract ~20 fields

### Database Check

```sql
SELECT
  name,
  jsonb_array_length(field_hints->'enabled_fields') as enabled_count,
  jsonb_array_length(field_hints->'critical_fields') as critical_count,
  field_hints->'enabled_fields' as fields,
  field_hints->'critical_fields' as critical
FROM suppliers
WHERE field_hints IS NOT NULL;
```

Should show different counts for each supplier!

## Current Status

✅ **Fixed:**
- Toast transparency issue (solid white backgrounds)
- Field selection dialog closes on click (uses custom modal pattern)

✅ **Already Working:**
- Supplier selection in upload form
- supplierId passed to extraction API
- Custom prompts built from field_hints
- Sample extraction used as few-shot example

✅ **Ready to Use:**
- Upload samples for different suppliers
- Configure different field sets
- Test extraction accuracy improvements

## Why Templates Might Look Generic

If you see similar extractions across suppliers, it could be because:

1. **No field_hints configured yet** → Uses default (all fields)
   - Solution: Configure field template after uploading sample

2. **All suppliers have same fields enabled** → Same extraction
   - Solution: Deselect fields that specific suppliers don't use

3. **Sample PDFs are similar** → Similar sample_extraction
   - Solution: Upload samples from different supplier formats

## Expected Behavior

After configuring 3 different suppliers:
- UI shows different field counts (e.g., "15 fields (2 critical)", "45 fields (5 critical)")
- Database shows different enabled_fields arrays
- Extractions focus on different field sets
- AI prompts are customized per supplier

The system is fully functional - just needs configuration per supplier to differentiate the templates!
