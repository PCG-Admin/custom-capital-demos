import { NextRequest, NextResponse } from 'next/server'
import { DocumentType, detectDocumentType, extractDocumentData } from '@/lib/ai-extraction'
import { getCurrentUser } from '@/lib/auth'
// Note: This endpoint only handles extraction. File persistence happens on workflow save.

export const runtime = 'nodejs'
export const maxDuration = 60 // Increase timeout for AI processing

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    let user
    try {
      user = await getCurrentUser()
    } catch (authError: any) {
      console.error('[System] Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed', details: authError?.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let file: Blob | null = null
    let type: DocumentType | null = null
    let supplierId: string | null = null
    let documentName: string = ''
    let documentMime: string = ''
    let documentSize: number = 0

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const json = await request.json()
      const { storagePath, bucket } = json
      type = json.type as DocumentType
      supplierId = json.supplierId as string | null
      documentName = json.fileName || 'unknown'
      documentMime = json.mimeType || 'application/pdf'

      if (!storagePath || !bucket) {
        return NextResponse.json({ error: 'Missing storage path or bucket' }, { status: 400 })
      }

      // Download file from Supabase Storage
      const { createServerClient } = await import('@/lib/supabase-server')
      const supabase = createServerClient()
      const { data, error } = await supabase.storage.from(bucket).download(storagePath)

      if (error || !data) {
        console.error('Download error:', error)
        return NextResponse.json({ error: 'Failed to download file from storage' }, { status: 500 })
      }

      file = data
      documentSize = data.size
    } else {
      const formData = await request.formData()
      file = formData.get('file') as File | null
      type = formData.get('type') as DocumentType | null
      supplierId = formData.get('supplierId') as string | null

      if (file) {
        documentName = (file as File).name
        documentMime = file.type
        documentSize = file.size
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!type || type !== 'rental-credit-application') {
      return NextResponse.json({ error: 'Only rental credit applications are supported' }, { status: 400 })
    }

    if (documentMime !== 'application/pdf' && !documentMime.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only PDF and image files are supported' },
        { status: 400 }
      )
    }

    // Only enforce size limit for direct uploads, storage uploads can be larger
    if (!contentType.includes('application/json') && documentSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. Maximum 10MB allowed.' },
        { status: 400 }
      )
    }

    let detectedType: DocumentType | null = null
    try {
      detectedType = await detectDocumentType(file)
    } catch (error) {
      console.warn('[System] Document type detection error:', error)
    }

    if (detectedType === 'rental-agreement') {
      console.warn('[System] Upload detected as rental-agreement, but proceeding for testing/dev purposes.')
    }

    const extractionResult = await extractDocumentData(file, 'rental-credit-application', supplierId)

    return NextResponse.json({
      success: true,
      type: extractionResult.type,
      detectedType: detectedType || type,
      expectedType: type,
      mismatch: false,
      extractedData: extractionResult.extractedData,
      derivedFields: extractionResult.derivedFields,
      documentName,
      documentMime,
      documentSize,
    })
  } catch (error: any) {
    console.error('[System] Upload error:', error)
    console.error('[System] Error stack:', error?.stack)
    console.error('[System] Error message:', error?.message)

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Smart Extraction API key is not configured. Please check your environment variables.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Upload failed', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
