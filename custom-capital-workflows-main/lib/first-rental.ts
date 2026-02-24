
import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const FIRST_RENTAL_TEMPLATE_FILENAME = 'CCF-First-Rental.pdf'
const FIRST_RENTAL_TEMPLATE_PATH = path.join(process.cwd(), 'public', FIRST_RENTAL_TEMPLATE_FILENAME)

type ApplicationRecord = {
    id: string
    business_name?: string | null
    applicant_name?: string | null
    // ... other fields
}

export type FirstRentalData = {
    companyName: string
    address: string
    deductionOption1: string // "Please deduct the first rental by special debit order on the commencement date of the rental agreement 1"
    deductionOption2: string // "Please deduct the first rental by special debit order on the commencement date of the rental agreement 2"
    bankName: string // Bank name
    branchName: string // Branch name
    branchCode: string
    accountNumber: string
    firstRentalAmount: string // "1st Rental in advance incl VAT"
    documentFee: string // "Once off document fee incl VAT"
    totalAmount: string // "Total amount to be deducted incl VAT"
    signedBy: string
    capacity: string // "In hisher capacity as"
    ofTheCompany: string // "of the company"
    witnessName: string
    signedAt: string
    dayNumber: string // "on this"
    month: string // "day of"
    year: string // "20"
}

export async function generateAndStoreFirstRental(application: ApplicationRecord, data: FirstRentalData) {
    try {
        const pdfBytes = await buildFirstRentalPdf(application, data)
        const supabase = createServerClient()
        const fileName = `First-Rental-${application.id.slice(0, 8)}.pdf`
        const storagePath = `applications/${application.id}/${fileName}`

        let publicUrl: string | null = null
        let lastError: any = null
        const bucketCandidates = getSupportingBucketCandidates() // ['supporting-documents', 'supporting_documents']

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
            console.error('Failed to upload first rental document', lastError)
            return null
        }

        const { error: dbError } = await supabase
            .from('supporting_documents')
            .insert({
                application_id: application.id,
                document_url: publicUrl,
                document_name: fileName,
                document_type: 'First Rental',
                uploaded_at: new Date().toISOString()
            })

        if (dbError) {
            console.error('Failed to insert first rental metadata', dbError)
            return null
        }

        return publicUrl
    } catch (error) {
        console.error('Error generating first rental document:', error)
        return null
    }
}

async function buildFirstRentalPdf(application: ApplicationRecord, data: FirstRentalData) {
    let pdfDoc: PDFDocument

    try {
        console.log('[first-rental] Loading template:', FIRST_RENTAL_TEMPLATE_PATH)
        const templateBytes = await fs.readFile(FIRST_RENTAL_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Debug: Log fields to help identify invalid field naming
        try {
            console.log('[first-rental] PDF Fields:', form.getFields().map(f => f.getName()))
            console.log('[first-rental] Data:', data)
        } catch (e) {
            console.warn('[first-rental] Could not list fields', e)
        }

        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
                console.log(`[first-rental] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
            } catch (e) {
                console.warn(`[first-rental] ✗ Failed to set field "${name}":`, (e as Error).message)
            }
        }

        // Map data to EXACT PDF field names (verified via PDF inspection)
        setField('Company Name', data.companyName)
        setField('Address', data.address)
        setField('Please deduct the first rental by special debit order on the commencement date of the rental agreement 1', data.deductionOption1)
        setField('Please deduct the first rental by special debit order on the commencement date of the rental agreement 2', data.deductionOption2)

        // Bank and Branch fields (added to PDF template)
        setField('Bank', data.bankName)
        setField('Branch', data.branchName)
        setField('Branch code', data.branchCode)
        setField('Account number', data.accountNumber)
        setField('1st Rental in advance incl VAT', data.firstRentalAmount)
        setField('Once off document fee incl VAT', data.documentFee)
        setField('Total amount to be deducted incl VAT', data.totalAmount)
        setField('Signed by', data.signedBy)
        setField('In hisher capacity as', data.capacity)
        setField('of the company', data.ofTheCompany)
        setField('Witness name', data.witnessName)
        setField('Signed at', data.signedAt)
        setField('on this', data.dayNumber)
        setField('day of', data.month)
        setField('20', data.year)

        form.flatten()
        return pdfDoc.save()
    } catch (error) {
        console.error('[first-rental] Failed to build PDF from template.', error)
        throw error // Rethrow so we know it failed
    }
}
