import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { getSupportingBucketCandidates } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pdfUrl, documentName, documentId, annotations } = body

    if (!pdfUrl || !documentName || !annotations) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the original PDF
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF')
    }

    const pdfBytes = await pdfResponse.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { height } = firstPage.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // Add text annotations
    for (const annotation of annotations) {
      if (annotation.type === 'text') {
        firstPage.drawText(annotation.content, {
          x: annotation.x,
          y: height - annotation.y - (annotation.fontSize || 12),
          size: annotation.fontSize || 12,
          font,
          color: rgb(0, 0, 0),
        })
      } else if (annotation.type === 'signature') {
        try {
          // Extract base64 image data
          const base64Data = annotation.content.split(',')[1]
          const imageBytes = Buffer.from(base64Data, 'base64')

          // Embed the PNG image
          const image = await pdfDoc.embedPng(imageBytes)
          const dims = image.scale(0.5) // Scale down signature

          firstPage.drawImage(image, {
            x: annotation.x || 20,
            y: height - (annotation.y || 150) - dims.height,
            width: dims.width,
            height: dims.height,
          })
        } catch (error) {
          console.error('Failed to embed signature:', error)
        }
      }
    }

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save()
    const supabase = createServerClient()

    // Extract application ID from document name or URL
    const appIdMatch = documentName.match(/([a-f0-9-]{36})/i)
    const applicationId = appIdMatch ? appIdMatch[1] : 'annotated'

    // Use original filename to replace the file
    const storagePath = `applications/${applicationId}/${documentName}`

    let publicUrl: string | null = null
    let lastError: any = null
    const bucketCandidates = getSupportingBucketCandidates()

    for (const bucket of bucketCandidates) {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, modifiedPdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError) {
        lastError = uploadError
        continue
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      if (urlData?.publicUrl) {
        publicUrl = urlData.publicUrl
        break
      }
    }

    if (!publicUrl) {
      console.error('Failed to upload annotated PDF', lastError)
      return NextResponse.json({ error: 'Failed to upload annotated PDF' }, { status: 500 })
    }

    // Update the database record if documentId is provided
    if (documentId) {
      const { error: updateError } = await supabase
        .from('custom_supporting_documents')
        .update({ document_url: publicUrl })
        .eq('id', documentId)

      if (updateError) {
        console.error('Failed to update database record:', updateError)
        // Don't fail the request, PDF is already saved
      }
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error: any) {
    console.error('[save-annotated-pdf] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save annotated PDF', details: error.message },
      { status: 500 }
    )
  }
}
