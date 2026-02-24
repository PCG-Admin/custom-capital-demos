import { PDFDocument, StandardFonts } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'
import { createServerClient } from '@/lib/supabase-server'
import { ApplicationRecord } from '@/lib/types'
import { getSupportingBucketCandidates } from './storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const LANDLORD_CONSENT_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'CCF-Ins-Landlord.pdf')

export type EquipmentRow = {
    quantity: string
    description: string
    serialNumbers: string
}

export type LandlordConsentData = {
    rentalAgreementFor: string
    of: string
    equipmentKeptFree: string
    equipmentRows: EquipmentRow[]
    signatureDay: string
    signatureMonth: string
    signatureYear: string
    nameOfSignatory: string
    nameOfWitness: string
}

export async function generateAndStoreLandlordConsent(application: ApplicationRecord, data: LandlordConsentData) {
    try {
        const pdfBytes = await buildLandlordConsentPdf(application, data)
        const supabase = createServerClient()
        const fileName = `Landlord-Consent-${application.id.slice(0, 8)}.pdf`
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
            console.error('Failed to upload landlord consent', lastError)
            return null
        }

        const { error: dbError } = await supabase
            .from('custom_supporting_documents')
            .insert({
                application_id: application.id,
                document_url: publicUrl,
                document_name: fileName,
                document_type: 'Landlord Consent',
                uploaded_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('Failed to insert landlord consent metadata', dbError)
            return null
        }

        return publicUrl
    } catch (error) {
        console.error('Error generating landlord consent:', error)
        return null
    }
}

async function buildLandlordConsentPdf(application: ApplicationRecord, data: LandlordConsentData) {
    let pdfDoc: PDFDocument

    try {
        console.log('[landlord-consent] Loading template:', LANDLORD_CONSENT_TEMPLATE_PATH)
        const templateBytes = await fs.readFile(LANDLORD_CONSENT_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Debug info
        try {
            console.log('[landlord-consent] PDF Fields:', form.getFields().map(f => f.getName()))
            console.log('[landlord-consent] Data:', data)
        } catch (e) {
            console.warn('[landlord-consent] Could not list fields', e)
        }

        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
                console.log(`[landlord-consent] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
            } catch (e) {
                console.warn(`[landlord-consent] ✗ Failed to set field "${name}":`, (e as Error).message)
            }
        }

        // Map data to PDF field names
        setField('In terms of rental agreement for', data.rentalAgreementFor)
        setField('of', data.of)
        setField('b The equipment will be kept free of any liens', data.equipmentKeptFree)

        // Equipment rows (max 6 items)
        const maxRows = 6
        for (let i = 0; i < maxRows; i++) {
            const row = data.equipmentRows[i]
            const rowNum = i + 1

            if (row) {
                setField(`QUANTITY ${rowNum}`, row.quantity)
                setField(`DESCRIPTION ${rowNum}`, row.description)
                setField(`SERIAL NUMBERS ${rowNum}`, row.serialNumbers)
            } else {
                // Clear unused rows
                setField(`QUANTITY ${rowNum}`, '')
                setField(`DESCRIPTION ${rowNum}`, '')
                setField(`SERIAL NUMBERS ${rowNum}`, '')
            }
        }

        // Signature date fields
        setField('Thus done and signed on behalf of the Renter on this', data.signatureDay)
        setField('day of', data.signatureMonth)
        setField('20', data.signatureYear)

        // Signatory fields
        setField('Name of Signatory', data.nameOfSignatory)
        setField('Name of Witness', data.nameOfWitness)

        form.flatten()
        return pdfDoc.save()
    } catch (error) {
        console.error('[landlord-consent] Failed to build PDF from template.', error)
        throw error
    }
}
