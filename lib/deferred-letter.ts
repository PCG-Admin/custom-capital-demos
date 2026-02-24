import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from './storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'
// import { ApplicationRecord } from '@/lib/types' // Removed: Module not found
// import { v4 as uuidv4 } from 'uuid' // Removed: Unused

// Define locally to fix import error
type ApplicationRecord = {
    id: string
    business_name?: string | null
    applicant_name?: string | null
    // Add other fields if needed for this specific file
}

const DEFERRED_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'Deferred.pdf')

export type DeferredLetterData = {
    date: string
    supplierEmail: string
    supplier: string
    attention: string
    clientName: string
    additionalRequirements: string
}

export async function generateAndStoreDeferredLetter(application: ApplicationRecord, data: DeferredLetterData) {
    try {
        const pdfBytes = await buildDeferredPdf(application, data)
        const supabase = createServerClient()
        const fileName = `Deferred-Letter-${application.id.slice(0, 8)}.pdf`
        const storagePath = `applications/${application.id}/${fileName}`

        let publicUrl: string | null = null
        let lastError: any = null
        const bucketCandidates = getSupportingBucketCandidates()

        for (const bucket of bucketCandidates) {
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

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
            console.error('Failed to upload deferred letter', lastError)
            return null
        }

        const { error: dbError } = await supabase
            .from('supporting_documents')
            .insert({
                application_id: application.id,
                document_url: publicUrl,
                document_name: fileName,
                document_type: 'Deferred Letter',
                uploaded_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('Failed to insert deferred letter metadata', dbError)
            return null
        }

        return publicUrl
    } catch (error) {
        console.error('Error generating deferred letter:', error)
        return null
    }
}

async function buildDeferredPdf(application: ApplicationRecord, data: DeferredLetterData) {
    let pdfDoc: PDFDocument

    try {
        console.log('[deferred-letter] Loading template:', DEFERRED_TEMPLATE_PATH)
        const templateBytes = await fs.readFile(DEFERRED_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Debug info
        try {
            console.log('[deferred-letter] PDF Fields:', form.getFields().map(f => f.getName()))
            console.log('[deferred-letter] Data:', data)
        } catch (e) {
            console.warn('[deferred-letter] Could not list fields', e)
        }

        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
            } catch (e) {
                // console.warn(`Field ${name} skipped`)
            }
        }

        // Mapping based on authenticated template inspection
        setField('Date', data.date)
        setField('Suppliers email address', data.supplierEmail) // Exact match: No apostrophe
        setField('Attention', data.attention)
        setField('Supplier', data.supplier)
        setField('Client name', data.clientName)

        // Large text area
        setField('Additional Requirements', data.additionalRequirements)

        form.flatten()
        return pdfDoc.save()
    } catch (error) {
        console.error('[deferred-letter] Failed to build PDF from template.', error)
        throw error
    }
}
