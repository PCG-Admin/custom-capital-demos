import { PDFDocument, StandardFonts } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'
import { createServerClient } from '@/lib/supabase-server'
import { ApplicationRecord } from '@/lib/types'
import { getSupportingBucketCandidates } from './storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const INSTALL_COA_TEMPLATE_PATH = path.join(process.cwd(), 'public', 'CCF-Contract-Install-COA.pdf')

export type InstallCOAData = {
    rentalAgreementDate: string
    qty1: string
    qty2: string
    qty3: string
    description1: string
    description2: string
    description3: string
    description4: string
    serialNumbers1: string
    serialNumbers2: string
    serialNumbers3: string
    serialNumbers4: string
    signatureDay: string
    signatureMonth: string
    signatureYear: string
    nameOfSignatory: string
    nameOfWitness: string
    text7: string
}

export async function generateAndStoreInstallCOA(application: ApplicationRecord, data: InstallCOAData) {
    try {
        const pdfBytes = await buildInstallCOAPdf(application, data)
        const supabase = createServerClient()
        const fileName = `Installation-COA-${application.id.slice(0, 8)}.pdf`
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
            console.error('Failed to upload installation COA', lastError)
            return null
        }

        const { error: dbError } = await supabase
            .from('supporting_documents')
            .insert({
                application_id: application.id,
                document_url: publicUrl,
                document_name: fileName,
                document_type: 'Install COA',
                uploaded_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('Failed to insert installation COA metadata', dbError)
            return null
        }

        return publicUrl
    } catch (error) {
        console.error('Error generating installation COA:', error)
        return null
    }
}

async function buildInstallCOAPdf(application: ApplicationRecord, data: InstallCOAData) {
    let pdfDoc: PDFDocument

    try {
        console.log('[install-coa] Loading template:', INSTALL_COA_TEMPLATE_PATH)
        const templateBytes = await fs.readFile(INSTALL_COA_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Debug info
        try {
            console.log('[install-coa] PDF Fields:', form.getFields().map(f => f.getName()))
            console.log('[install-coa] Data:', data)
        } catch (e) {
            console.warn('[install-coa] Could not list fields', e)
        }

        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
                console.log(`[install-coa] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
            } catch (e) {
                console.warn(`[install-coa] ✗ Failed to set field "${name}":`, (e as Error).message)
            }
        }

        const getFieldRect = (name: string) => {
            try {
                const field = form.getTextField(name)
                const widget = field.acroField.getWidgets()[0]
                return widget.getRectangle()
            } catch {
                return null
            }
        }

        // Map data to PDF field names
        setField('The equipment described below and as per the Rental Agreement dated', data.rentalAgreementDate)

        // Quantity fields in this template are vertically offset from DESCRIPTION rows.
        // Clear original quantity widgets and draw aligned quantity text manually.
        setField('1', '')
        setField('2', '')
        setField('3', '')

        // Description fields
        setField('DESCRIPTION 1', data.description1)
        setField('DESCRIPTION 2', data.description2)
        setField('DESCRIPTION 3', data.description3)
        setField('DESCRIPTION 4', data.description4)

        // Serial number fields
        setField('SERIAL NUMBERS 1', data.serialNumbers1)
        setField('SERIAL NUMBERS 2', data.serialNumbers2)
        setField('SERIAL NUMBERS 3', data.serialNumbers3)
        setField('SERIAL NUMBERS 4', data.serialNumbers4)

        // Signature date fields - trying multiple possible field name variations
        // The exact field names will be logged in console for verification
        setField('Thus done and signed on behalf of the Renter on this', data.signatureDay)
        setField('day of', data.signatureMonth)
        setField('20', data.signatureYear)

        // Alternative field name attempts (one of these should work)
        setField('Day', data.signatureDay)
        setField('Month', data.signatureMonth)
        setField('Year', data.signatureYear)
        setField('Signature Day', data.signatureDay)
        setField('Signature Month', data.signatureMonth)
        setField('Signature Year', data.signatureYear)

        // Signatory fields
        setField('Name of Signatory', data.nameOfSignatory)
        setField('Name of Witness', data.nameOfWitness)
        setField('Text7', data.text7)

        // Draw qty1/qty2/qty3 aligned to DESCRIPTION 1/2/3 rows.
        const page = pdfDoc.getPages()[0]
        const qtyColumnRect = getFieldRect('1')
        const descriptionRects = [
            getFieldRect('DESCRIPTION 1'),
            getFieldRect('DESCRIPTION 2'),
            getFieldRect('DESCRIPTION 3'),
        ]
        const quantities = [data.qty1, data.qty2, data.qty3]

        if (page && qtyColumnRect) {
            for (let i = 0; i < descriptionRects.length; i++) {
                const rect = descriptionRects[i]
                const qty = quantities[i] || ''
                if (!rect || !qty) continue
                page.drawText(qty, {
                    x: qtyColumnRect.x + 2,
                    y: rect.y + 3,
                    size: 10,
                    font,
                })
            }
        }

        form.flatten()
        return pdfDoc.save()
    } catch (error) {
        console.error('[install-coa] Failed to build PDF from template.', error)
        throw error
    }
}
