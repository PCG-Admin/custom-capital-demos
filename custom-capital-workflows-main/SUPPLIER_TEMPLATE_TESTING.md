# Supplier Template System - Testing Guide

## Overview
The supplier template system has been completely redesigned to support supplier-specific field extraction. This guide will help you test the new functionality.

## What's New

### 1. **Field Selection Interface**
After uploading a sample PDF, you can now:
- Select which fields this supplier's forms actually contain
- Mark fields as "critical" (highlighted/important on the supplier's forms)
- Add custom notes for specific fields (e.g., "Usually in red box at top right")

### 2. **Supplier-Specific Extraction**
The AI extraction is now customized per supplier:
- Only requests fields that the supplier actually uses
- Emphasizes critical fields in the prompt
- Uses sample extraction as a few-shot example
- Includes custom field notes in the extraction prompt

### 3. **Visual Indicators**
Suppliers now show:
- **Template Ready** badge when a sample is uploaded
- **Field count** badge showing enabled fields (e.g., "45 fields")
- **Critical count** badge showing critical fields (e.g., "45 fields (5 critical)")

## Testing Workflow

### Step 1: Create a New Supplier
1. Navigate to Settings page
2. Click "Add Supplier" or use the "Add New Supplier" form
3. Enter supplier name (e.g., "Acme Equipment Rentals")
4. Add description (optional)
5. Click "Create Supplier"

### Step 2: Upload Sample PDF
1. Click the **Upload** (file-up icon) button for the supplier
2. Select a sample application PDF from this supplier
3. Wait for extraction to complete
4. **Field Selection Dialog** will automatically open

### Step 3: Configure Field Template
The Field Selection Dialog shows all available fields grouped by category:
- **Critical Fields** - Often highlighted fields like settlement, escalation
- **Company Information** - Business name, registration, VAT, contacts
- **Addresses** - Business, postal, installation, delivery addresses
- **Financial Details** - Rental amounts, terms, fees
- **Equipment Details** - Equipment descriptions and quantities
- **Banking Details** - Bank name, account details
- **Supplier Information** - Supplier email
- **Additional Information** - Turnover, asset value, solvency
- **Other Contacts** - Auditors, insurers, landlord

#### Configure Fields:
1. **Quick Selection Options**:
   - "Select All" - Enable all fields
   - "Select Extracted Only" - Enable only fields that were found in the sample
   - "Deselect All" - Clear all selections

2. **Individual Field Configuration**:
   - Check/uncheck fields that appear on this supplier's forms
   - Fields with "Extracted" badge were found in the sample
   - Click "Mark as Critical" for highlighted/important fields
   - Add field notes for special instructions (optional)

3. **Save Template**:
   - Click "Save Template" when done
   - The dialog will close and field_hints will be saved

### Step 4: Verify Configuration
After saving, the supplier card should show:
- **Template Ready** badge (green)
- **Field count** badge (blue) - e.g., "42 fields (4 critical)"

### Step 5: Test Extraction
1. Go to the main upload page
2. Select the supplier from the dropdown
3. Upload a real application from this supplier
4. Verify that:
   - Only configured fields are extracted
   - Critical fields are prioritized
   - Extraction accuracy is improved

### Step 6: Reconfigure (Optional)
You can reconfigure fields at any time:
1. Click the **Settings** (gear icon) button for the supplier
2. Modify field selections
3. Save changes

## What to Test

### Test Case 1: Different Suppliers, Different Fields
1. Create 3 suppliers
2. Upload different sample PDFs for each
3. Configure different field sets for each:
   - Supplier A: Only basic fields (name, amount, term)
   - Supplier B: All financial and banking fields
   - Supplier C: Full set including equipment and contacts
4. Verify that `field_hints` in the database are different for each

### Test Case 2: Critical Fields
1. Upload a sample PDF with highlighted fields (red/pink boxes)
2. Mark those same fields as critical
3. Upload a new application from this supplier
4. Verify extraction accuracy for critical fields

### Test Case 3: Field Notes
1. Configure a supplier with field notes:
   - "settlement": "Located in top-right red box"
   - "escalation": "Usually marked with asterisk"
2. Upload a new application
3. Check if extraction improves with the notes

### Test Case 4: Sample Extraction as Few-Shot Example
1. Upload a sample with complete data
2. Configure all extracted fields
3. Upload a similar application from the same supplier
4. Verify that extraction matches the sample's format

### Test Case 5: Supplier Without Template
1. Upload an application WITHOUT selecting a supplier
2. Verify it uses the generic extraction prompt
3. Compare results to supplier-specific extraction

## Database Verification

Check the `suppliers` table in Supabase:

```sql
SELECT
  name,
  sample_pdf_name,
  field_hints->'enabled_fields' as enabled_fields,
  field_hints->'critical_fields' as critical_fields,
  jsonb_array_length(field_hints->'enabled_fields') as enabled_count,
  jsonb_array_length(field_hints->'critical_fields') as critical_count
FROM suppliers
WHERE sample_pdf_url IS NOT NULL;
```

Expected result:
- Each supplier should have different `enabled_fields` arrays
- `critical_fields` should vary based on configuration
- Counts should match what you see in the UI

## Expected Improvements

### Before (Generic Extraction)
- All suppliers extracted with identical prompts
- All 70+ fields requested regardless of form content
- No emphasis on critical/highlighted fields
- `field_hints` was always empty/null
- `sample_extraction` was identical across suppliers

### After (Supplier-Specific Extraction)
- Each supplier has a custom prompt with only relevant fields
- Critical fields are emphasized in the prompt
- Sample extraction is used as few-shot example
- `field_hints` contains supplier-specific configuration
- `sample_extraction` varies based on supplier's actual forms

## File Changes Summary

### New Files
- `lib/extraction-fields.ts` - Field definitions and utilities
- `components/field-selection-dialog.tsx` - Field configuration UI
- `components/ui/accordion.tsx` - UI component
- `components/ui/scroll-area.tsx` - UI component
- `components/ui/separator.tsx` - UI component

### Modified Files
- `lib/ai-extraction.ts` - Added custom prompt building, supplier-aware extraction
- `components/supplier-management.tsx` - Added field selection integration
- `components/supplier-settings.tsx` - Added field selection integration
- `app/api/suppliers/[id]/route.ts` - Already supports field_hints (no changes needed)

## Troubleshooting

### Issue: Field Selection Dialog Doesn't Open
- Check browser console for errors
- Verify sample was extracted successfully (check network tab)
- Ensure extraction completed (extractSample=true in upload)

### Issue: Field Configuration Not Saving
- Check network tab for PUT request to `/api/suppliers/[id]`
- Verify field_hints structure is valid JSON
- Check Supabase logs for errors

### Issue: Extraction Still Generic
- Verify supplier has field_hints configured
- Check that supplierId is passed during upload
- Verify buildCustomApplicationPrompt is being called

### Issue: Wrong Fields Extracted
- Review configured field selections
- Check if critical fields are properly marked
- Verify sample extraction has good quality data

## Success Criteria

✅ **Field Selection Dialog**
- Opens automatically after sample upload
- Shows all field categories
- Allows field enable/disable
- Allows marking fields as critical
- Allows adding field notes
- Saves configuration successfully

✅ **Database**
- field_hints populated with correct structure
- enabled_fields array contains selected field keys
- critical_fields array contains critical field keys
- field_notes object contains custom notes

✅ **Extraction**
- Supplier-specific prompts generated correctly
- Only configured fields are extracted
- Critical fields emphasized in prompt
- Sample extraction used as context
- Improved accuracy for known suppliers

✅ **UI Indicators**
- "Template Ready" badge shows when sample uploaded
- Field count badge shows correct numbers
- Configure fields button (gear icon) works
- Visual distinction between configured/unconfigured suppliers

## Next Steps

After successful testing:
1. Upload samples for all your regular suppliers
2. Configure field templates for each
3. Compare extraction accuracy before/after
4. Adjust field configurations as needed
5. Document which fields work best for each supplier

## Notes

- Field templates are optional - suppliers work without them
- You can reconfigure at any time
- Multiple samples can be uploaded (latest overwrites)
- Inactive suppliers retain their templates
- Templates are used during extraction, not during save
