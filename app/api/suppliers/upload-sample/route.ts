import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { extractDocumentData } from '@/lib/ai-extraction'
import { APPLICATION_FIELD_DEFINITIONS } from '@/lib/extraction-fields'

// Helper function to auto-generate field_hints from extracted data
// Now supports dynamic fields beyond the predefined 52 fields
// All fields are treated equally (no critical field distinction)
// For blank templates, captures field STRUCTURE (what fields exist) not just field VALUES
function generateFieldHintsFromExtraction(extractedData: any) {
  const enabledFields: string[] = []
  const dynamicFields: Record<string, string> = {} // Maps snake_case field to user-friendly label

  // First, check predefined fields
  // For templates, if the AI extracted a field (even as N/A), it means that field exists on the form
  for (const fieldDef of APPLICATION_FIELD_DEFINITIONS) {
    const value = extractedData[fieldDef.schemaKey]

    // Field is considered "found" if it exists in the extraction
    // The AI only includes fields it actually saw on the document
    const isFound = value !== undefined && value !== null

    if (isFound) {
      enabledFields.push(fieldDef.key)
    }
  }

  // Also capture any fields from extraction that aren't in our predefined list
  // This allows templates to have supplier-specific fields
  // For blank templates, we capture field labels even if values are N/A
  const predefinedSchemaKeys = new Set(APPLICATION_FIELD_DEFINITIONS.map(f => f.schemaKey))

  // Helper function to check if a key looks like a meaningful field name
  const isMeaningfulFieldName = (key: string): boolean => {
    // Filter out very short abbreviations that are likely checkbox options
    const parts = key.split('_')
    if (parts.length === 1 && parts[0].length <= 3) {
      // Single word, 3 chars or less (e.g., "cc", "ltd", "gov", "ass") - likely a checkbox option
      return false
    }

    // Filter out numbered duplicates (name2, name3, etc.) - should be grouped as arrays
    if (/_\d+$/.test(key)) {
      // Ends with underscore and number (e.g., "name_surname_2", "code_2")
      return false
    }

    // Filter out yes/no variations (rsa_yn, rsa_yn2, etc.)
    if (/_yn\d*$/.test(key)) {
      return false
    }

    // Filter out very generic single-word fields without context
    const genericFields = ['code', 'date', 'email', 'web', 'bank', 'branch', 'period', 'model', 'rental', 'quantity']
    if (parts.length === 1 && genericFields.includes(parts[0])) {
      return false
    }

    return true
  }

  for (const [key, value] of Object.entries(extractedData)) {
    // Only include if key is meaningful and not undefined/null
    // Accept N/A and empty strings because they indicate blank template fields
    if (!predefinedSchemaKeys.has(key) && value !== undefined && value !== null && isMeaningfulFieldName(key)) {
      // Convert snake_case to Title Case for label
      const label = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      dynamicFields[key] = label
    }
  }

  console.log(`[System] Auto-detected ${enabledFields.length} predefined fields + ${Object.keys(dynamicFields).length} dynamic fields from template`)

  return {
    enabled_fields: enabledFields,
    field_notes: {},
    dynamic_fields: dynamicFields // Store dynamic fields for later use
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const supplierId = formData.get('supplierId') as string | null
    const extractSample = formData.get('extractSample') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 })
    }

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only PDF and image files are supported' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed.' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check if supplier exists
    const { data: supplier, error: supplierError } = await supabase
      .from('custom_suppliers')
      .select('id, name')
      .eq('id', supplierId)
      .single()

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Upload file to Supabase storage in 'suppliers' bucket
    const storagePath = `samples/${supplierId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('suppliers')
      .upload(storagePath, file, { upsert: true })

    if (uploadError) {
      console.error('[System] Error uploading sample PDF:', uploadError)
      return NextResponse.json({
        error: 'Failed to upload sample PDF',
        details: uploadError.message || 'Storage upload failed. Ensure the "suppliers" bucket exists.'
      }, { status: 500 })
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('suppliers')
      .getPublicUrl(storagePath)

    const samplePdfUrl = urlData.publicUrl

    // Optionally extract data from the sample PDF
    let sampleExtraction = null
    let autoFieldHints = null
    if (extractSample) {
      try {
        // Use 'sample-template' type for open-ended field extraction
        const extractionResult = await extractDocumentData(file, 'sample-template', null)
        sampleExtraction = extractionResult.extractedData

        // Auto-generate field_hints based on extracted fields
        autoFieldHints = generateFieldHintsFromExtraction(sampleExtraction)

        console.log('[System] Sample extraction captured fields:', Object.keys(sampleExtraction))
      } catch (extractError) {
        console.error('[System] Error extracting sample data:', extractError)
        // Continue without extraction - not a critical error
      }
    }

    // Update supplier with sample PDF info
    const updateData: any = {
      sample_pdf_url: samplePdfUrl,
      sample_pdf_name: file.name,
      updated_at: new Date().toISOString(),
    }

    if (sampleExtraction) {
      updateData.sample_extraction = sampleExtraction
    }

    // Auto-populate field_hints with only extracted fields
    if (autoFieldHints) {
      updateData.field_hints = autoFieldHints
    }

    const { data: updatedSupplier, error: updateError } = await supabase
      .from('custom_suppliers')
      .update(updateData)
      .eq('id', supplierId)
      .select()
      .single()

    if (updateError) {
      console.error('[System] Error updating supplier with sample:', updateError)
      return NextResponse.json({ error: 'Failed to update supplier', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      supplier: updatedSupplier,
      extracted: !!sampleExtraction
    })
  } catch (error) {
    console.error('[System] Upload sample error:', error)
    return NextResponse.json({ error: 'Failed to upload sample', details: (error as any)?.message }, { status: 500 })
  }
}
