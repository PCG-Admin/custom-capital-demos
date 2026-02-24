import { PDFDocument, StandardFonts } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'
import { createServerClient } from '@/lib/supabase-server'
import { ApplicationRecord } from '@/lib/types'
import { getSupportingBucketCandidates } from './storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const INSTALL_VERIFICATION_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'CCF-Install-Verification.pdf')

export type InstallVerificationData = {
    rentalAgreementFor: string
    of: string
    bySigningThisDocument: string
    idNo: string
    inMyCapacityAs: string
    agreementSignedByClientOn: string
    thusDoneAndSignedAt: string
    onThis: string
    dayOf: string
    year: string
}

export async function generateAndStoreInstallVerification(application: ApplicationRecord, data: InstallVerificationData) {
    try {
        const pdfBytes = await buildInstallVerificationPdf(application, data)
        const supabase = createServerClient()
        const fileName = `Installation-Verification-${application.id.slice(0, 8)}.pdf`
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
            console.error('Failed to upload installation verification', lastError)
            return null
        }

        const { error: dbError } = await supabase
            .from('custom_supporting_documents')
            .insert({
                application_id: application.id,
                document_url: publicUrl,
                document_name: fileName,
                document_type: 'Installation Verification',
                uploaded_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('Failed to insert installation verification metadata', dbError)
            return null
        }

        return publicUrl
    } catch (error) {
        console.error('Error generating installation verification:', error)
        return null
    }
}

async function buildInstallVerificationPdf(application: ApplicationRecord, data: InstallVerificationData) {
    let pdfDoc: PDFDocument

    try {
        console.log('[install-verification] Loading template:', INSTALL_VERIFICATION_TEMPLATE_PATH)
        const templateBytes = await fs.readFile(INSTALL_VERIFICATION_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Debug info
        try {
            console.log('[install-verification] PDF Fields:', form.getFields().map(f => f.getName()))
            console.log('[install-verification] Data:', data)
        } catch (e) {
            console.warn('[install-verification] Could not list fields', e)
        }

        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
                console.log(`[install-verification] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
            } catch (e) {
                console.warn(`[install-verification] ✗ Failed to set field "${name}":`, (e as Error).message)
            }
        }

        // Map data to PDF field names
        setField('In terms of rental agreement for', data.rentalAgreementFor)
        setField('of', data.of)
        setField('By signing this document I', data.bySigningThisDocument)
        setField('ID no', data.idNo)
        setField('In my capacity as', data.inMyCapacityAs)
        setField('Agreement signed by the client on', data.agreementSignedByClientOn)
        setField('Thus done and signed at', data.thusDoneAndSignedAt)
        setField('on this', data.onThis)
        setField('day of', data.dayOf)
        setField('20', data.year)

        form.flatten()
        return pdfDoc.save()
    } catch (error) {
        console.error('[install-verification] Failed to build PDF from template.', error)
        throw error
    }
}
