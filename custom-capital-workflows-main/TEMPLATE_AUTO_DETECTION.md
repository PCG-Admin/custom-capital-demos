# Supplier Template Auto-Detection

## What Changed ✅

The supplier template system now **automatically detects** which fields are present in each supplier's sample PDF instead of defaulting to all 52 fields.

## How It Works

### 1. Upload Sample PDF

When you upload a sample for a supplier:

```
Upload Sample → AI Extraction → Auto-Detect Fields → Save Template
```

### 2. Auto-Detection Logic

The system checks each of the 52 available fields and includes it in the template **only if**:
- Value is not `undefined`
- Value is not `null`
- Value is not `"N/A"`
- Value is not empty string `""`
- If it's an array, it has at least one item

### 3. Auto-Generated Template

**Example: Supplier A (Basic Forms)**
```json
{
  "enabled_fields": [
    "businessName",
    "applicantName",
    "rentalAmount",
    "term",
    "supplierName",
    "settlement"
  ],
  "critical_fields": [
    "supplierName",
    "settlement"
  ],
  "field_notes": {}
}
```
**Result:** Template with 6 fields (2 critical)

**Example: Supplier B (Full Financial Forms)**
```json
{
  "enabled_fields": [
    "businessName",
    "registrationNumber",
    "vatNumber",
    "applicantName",
    "applicantEmail",
    "applicantPhone",
    "businessAddress",
    "rentalAmount",
    "rentalExclVat",
    "rentalTerm",
    "paymentPeriod",
    "settlement",
    "escalation",
    "supplierName",
    "supplierEmail",
    "bankName",
    "bankBranch",
    "accountNumber",
    "accountHolder",
    "equipmentDescription"
  ],
  "critical_fields": [
    "supplierName",
    "settlement",
    "escalation",
    "paymentPeriod",
    "rentalExclVat"
  ],
  "field_notes": {}
}
```
**Result:** Template with 20 fields (5 critical)

**Example: Supplier C (Minimal Quote Forms)**
```json
{
  "enabled_fields": [
    "businessName",
    "rentalAmount",
    "supplierName"
  ],
  "critical_fields": [
    "supplierName"
  ],
  "field_notes": {}
}
```
**Result:** Template with 3 fields (1 critical)

## Before vs After

### Before
- All 3 suppliers: 52 fields enabled
- Generic extraction prompts
- Many N/A values in results
- No differentiation between suppliers

### After
- Supplier A: 6 fields
- Supplier B: 20 fields
- Supplier C: 3 fields
- Custom prompts per supplier
- Focused extraction
- Each supplier truly unique

## Field Categories Auto-Marked as Critical

Fields in the "Critical Fields" category are automatically marked as critical if found:
- supplierName
- settlement
- escalation
- paymentPeriod
- rentalExclVat

## User Workflow

### 1. Upload Sample
Go to Settings → Suppliers → Upload sample PDF

### 2. Auto-Detection Happens
- System extracts all fields using generic prompt
- Detects which fields have actual values
- Creates template with only those fields
- Auto-marks critical fields

### 3. Review & Adjust (Optional)
Field selection dialog opens showing:
- Only detected fields are enabled
- Fields with "Extracted" badge were found
- Critical fields already marked
- You can add/remove fields manually
- You can adjust critical fields
- You can add field notes

### 4. Save Template
Click "Save Template" → Supplier is ready!

### 5. Use Template
When uploading applications:
- Select this supplier
- AI uses custom template
- Extracts only relevant fields
- Higher accuracy!

## Console Logging

When uploading samples, check the console for:
```
[System] Auto-detected 18 fields from extraction (4 critical)
```

This confirms how many fields were found in the sample.

## Verification

### Check Templates in UI
Each supplier should show different field counts:
```
Supplier A: "6 fields (2 critical)"
Supplier B: "20 fields (5 critical)"
Supplier C: "3 fields (1 critical)"
```

### Check Database
```sql
SELECT
  name,
  jsonb_array_length(field_hints->'enabled_fields') as fields,
  field_hints->'enabled_fields' as enabled
FROM suppliers
WHERE field_hints IS NOT NULL;
```

Should show different field arrays for each supplier!

## Key Benefits

1. **Automatic** - No manual field selection required
2. **Accurate** - Based on actual sample content
3. **Unique** - Each supplier gets different template
4. **Focused** - AI only extracts relevant fields
5. **Adjustable** - Can still modify manually if needed

## Testing Different Templates

### Test 1: Basic Supplier
Upload a simple quote form → Should detect ~5-10 fields

### Test 2: Full Application
Upload complete credit application → Should detect 20-30 fields

### Test 3: Minimal Form
Upload basic inquiry form → Should detect 3-5 fields

Each should create a different template!

## Expected Results

After uploading 3 different samples:
- ✅ Different field counts in UI
- ✅ Different enabled_fields in database
- ✅ Different extraction prompts generated
- ✅ Focused, accurate extractions per supplier

The templates will now be **exactly as extracted from each supplier's sample PDF**!
