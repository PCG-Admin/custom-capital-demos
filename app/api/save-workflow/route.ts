import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildStoragePath, getWorkflowBucketCandidates } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/auth-utils'
export const maxDuration = 60 // Increase timeout for large workflows
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let extractedData: any
    let derivedFields: any
    let supplierId: string | null = null
    let documentName: string = ''
    let documentMime: string = ''
    let documentSize: number = 0
    let documentUrl: string | null = null

    const supabase = createServerClient()
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const json = await request.json()
      const { storagePath, bucket, type, fileInfo } = json
      extractedData = json.extractedData
      derivedFields = json.derivedFields
      supplierId = json.supplierId as string | null

      if (!storagePath || !bucket) {
        return NextResponse.json({ error: 'Missing storage path or bucket' }, { status: 400 })
      }

      if (type !== 'rental-credit-application') {
        return NextResponse.json({ error: 'Only rental credit applications can be saved' }, { status: 400 })
      }

      // Get public URL directly from existing storage path
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      documentUrl = urlData.publicUrl

      if (fileInfo) {
        documentName = fileInfo.name
        documentMime = fileInfo.mime
        documentSize = fileInfo.size
      }
    } else {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const type = formData.get('type') as string | null
      const extractedDataRaw = formData.get('extractedData') as string | null
      const derivedFieldsRaw = formData.get('derivedFields') as string | null
      supplierId = formData.get('supplierId') as string | null

      if (!file) {
        return NextResponse.json({ error: 'Missing original document' }, { status: 400 })
      }

      if (type !== 'rental-credit-application') {
        return NextResponse.json({ error: 'Only rental credit applications can be saved' }, { status: 400 })
      }

      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only PDF and image files are supported' }, { status: 400 })
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed.' }, { status: 400 })
      }

      extractedData = extractedDataRaw ? JSON.parse(extractedDataRaw) : null
      derivedFields = derivedFieldsRaw ? JSON.parse(derivedFieldsRaw) : null

      documentName = file.name
      documentMime = file.type
      documentSize = file.size

      // Upload file logic
      const bucketCandidates = getWorkflowBucketCandidates('rental-credit-application')
      const pathPrefix = 'applications'
      const storagePath = buildStoragePath(pathPrefix, file.name)

      let lastError: any = null

      for (const bucket of bucketCandidates) {
        const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, { upsert: true })
        if (uploadError) {
          lastError = uploadError
          continue
        }

        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
        // Public URL generation is synchronous and doesn't return an error in this client version

        if (!urlData.publicUrl) {
          lastError = 'Failed to generate public URL'
          continue
        }

        documentUrl = urlData.publicUrl
        break
      }

      if (!documentUrl) {
        console.error('[System] Failed to upload original document', { lastError, bucketCandidates })
        return NextResponse.json({
          error: 'Failed to upload document to storage',
          details: lastError?.message || lastError || 'Unknown storage error',
          bucketsTried: bucketCandidates,
        }, { status: 500 })
      }
    }

    if (!extractedData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    if (!documentUrl) {
      return NextResponse.json({ error: 'Failed to generate document URL' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('rental_credit_applications')
      .insert({
        document_name: documentName,
        document_url: documentUrl,
        document_mime: documentMime,
        document_size: documentSize,
        status: 'pending',
        current_step: 1,
        applicant_name: derivedFields?.applicant_name,
        applicant_email: derivedFields?.applicant_email,
        applicant_phone: derivedFields?.applicant_phone,
        business_name: derivedFields?.business_name,
        rental_amount: derivedFields?.rental_amount,
        rental_term: derivedFields?.rental_term,
        extracted_data: extractedData,
        supplier_id: supplierId && supplierId !== 'unknown' ? supplierId : null,
      })
      .select()
      .single()

    if (error) {
      console.error('[System] Supabase insert error (application):', error)
      return NextResponse.json({ error: 'Failed to insert application', details: error.message || error }, { status: 500 })
    }

    // SECURITY: Create audit log
    const ipAddress = getClientIp(request)
    const userAgent = getUserAgent(request)
    await createAuditLog(
      user.id,
      'CREATE_APPLICATION',
      'rental_credit_application',
      data.id,
      null,
      { document_name: documentName, applicant_name: derivedFields?.applicant_name },
      ipAddress,
      userAgent
    ).catch(err => console.error('[audit] Failed to log application creation:', err))

    revalidatePath('/workflows')
    revalidatePath('/rental-credit-application')

    return NextResponse.json({ success: true, record: data })
  } catch (error) {
    console.error('[System] Save error:', error)
    return NextResponse.json({ error: 'Failed to save workflow', details: (error as any)?.message || error }, { status: 500 })
  }
}
