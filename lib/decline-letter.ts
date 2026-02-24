import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const DECLINE_TEMPLATE_FILENAME = 'Declined.pdf'
const DECLINE_TEMPLATE_PATH = path.join(process.cwd(), 'public', DECLINE_TEMPLATE_FILENAME)

type ApplicationRecord = {
    id: string
    business_name?: string | null
    applicant_name?: string | null
    created_at?: string | null
    // We might want other fields if needed
}

export async function generateAndStoreDeclineLetter(application: ApplicationRecord, reason: string, data?: any) {
    try {
        const pdfBytes = await buildDeclinePdf(application, reason, data)
        const supabase = createServerClient()
        const fileName = `Decline-Letter-${application.id.slice(0, 8)}.pdf`

        // We use the same storage path logic as supporting documents: applications/[id]/[filename]
        const storagePath = `applications/${application.id}/${fileName}`
        const bucketCandidates = getSupportingBucketCandidates()

        let publicUrl: string | null = null
        let lastError: any = null

        for (const bucket of bucketCandidates) {
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

            if (uploadError) {
                lastError = uploadError
                continue
            }

            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)

            // getPublicUrl is typically synchronous and doesn't return an error in newer ver, 
            // but if it did, we'd handle it. Here we assume success if data exists.
            if (!urlData.publicUrl) {
                continue
            }

            publicUrl = urlData.publicUrl
            break
        }

        if (!publicUrl) {
            console.error('Failed to upload decline letter', lastError)
            return null
        }

        // Store metadata in supporting_documents table
        const { error: dbError } = await supabase
            .from('custom_supporting_documents')
            .insert({
                application_id: application.id,
                document_url: publicUrl,
                document_name: fileName,
                document_type: 'Decline Letter',
                uploaded_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('Failed to insert decline letter metadata', dbError)
            return null
        }

        return publicUrl
    } catch (error) {
        console.error('Error generating decline letter:', error)
        return null
    }
}

async function buildDeclinePdf(application: ApplicationRecord, reason: string, data?: any) {
    let pdfDoc: PDFDocument

    try {
        const templateBytes = await fs.readFile(DECLINE_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Helper to safely set fields if they exist
        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
            } catch (e) {
                console.warn(`Field '${name}' not found in decline template`)
            }
        }

        const hasDataKey = (key: string) => Boolean(data && Object.prototype.hasOwnProperty.call(data, key))
        const dateStr = hasDataKey('date') ? String(data?.date ?? '') : ''
        const businessName = hasDataKey('clientName') ? String(data?.clientName ?? '') : (application.business_name || '')
        const applicantName = hasDataKey('attention') ? String(data?.attention ?? '') : (application.applicant_name || '')
        const supplier = hasDataKey('supplier') ? String(data?.supplier ?? '') : ''
        const supplierEmail = hasDataKey('supplierEmail') ? String(data?.supplierEmail ?? '') : ''

        console.log('[decline-letter] Building PDF with:', { dateStr, businessName, applicantName, supplier, supplierEmail, reason, dataRaw: data })

        // Debug field names
        try {
            console.log('[decline-letter] Available PDF fields:', form.getFields().map(f => f.getName()))
        } catch (e) {
            console.warn('Could not list fields', e)
        }

        // Map fields based on inspection of public/Declined.pdf
        setField('Date', dateStr)
        setField('Client name', businessName)
        setField('Attention', applicantName)

        // Supplier fields
        setField('Supplier', supplier)
        setField('Suppliers email address', supplierEmail) // Exact match: No apostrophe

        // Reasons
        setField('Reasons for Decline 1', reason)
        // setField('Reasons for Decline 2', '') // Available if needed 

        form.flatten()
        return pdfDoc.save()

    } catch (error) {
        console.warn('Could not load Declined.pdf template or fill fields, falling back to basic PDF', error)
        // Fallback: Create from scratch
        pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([595, 842])
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const { width, height } = page.getSize()

        page.drawText('Decline Letter', { x: 50, y: height - 50, size: 20, font })
        page.drawText('Date: ', { x: 50, y: height - 80, size: 12, font })
        page.drawText(`Client: ${application.business_name || application.applicant_name || ''}`, { x: 50, y: height - 100, size: 12, font })
        page.drawText('Reason:', { x: 50, y: height - 130, size: 12, font })
        page.drawText(reason, { x: 50, y: height - 150, size: 12, font, maxWidth: 500 })

        return pdfDoc.save()
    }
}
