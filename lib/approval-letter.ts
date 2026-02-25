
import path from 'path'
import { promises as fs } from 'fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerClient } from '@/lib/supabase-server'
import { getSupportingBucketCandidates } from '@/lib/storage'
import { setTextFieldAutoSized } from '@/lib/pdf-field-utils'

const APPROVAL_TEMPLATE_FILENAME = 'Approval-letter.pdf'
const APPROVAL_TEMPLATE_PATH = path.join(process.cwd(), 'public', APPROVAL_TEMPLATE_FILENAME)

type ApplicationRecord = {
    id: string
    business_name?: string | null
    applicant_name?: string | null
    // ... other fields
}

export type ApprovalLetterData = {
    date: string
    clientName: string
    attention: string
    address: string
    amount: string
    term: string
    rate: string
    installment: string
    supplier: string
    supplierEmail: string
    regNumber: string
    equipmentSchedule: string
    payoutExclVat: string
    settlement: string
    escalation: string
    rentalExclVat: string
    factor: string
    period: string
    rentalInclInsExclVat: string
    docFee: string
    additionalConditions: string
    // Checkboxes
    correctAuthorisingResolution?: boolean
    debitOrder?: boolean
    ficadIdSignatories?: boolean
    suretyMembers?: boolean
    cancelledCheque?: boolean
    copyLetterhead?: boolean
    contractInstallation?: boolean
    insuranceLandlord?: boolean
    firstRentalPaid?: boolean
}

export async function generateAndStoreApprovalLetter(application: ApplicationRecord, data: ApprovalLetterData) {
    try {
        console.log('[approval-letter] ===== STARTING APPROVAL LETTER GENERATION =====')
        console.log('[approval-letter] Application ID:', application.id)
        console.log('[approval-letter] Building PDF with data:', {
            hasAdditionalConditions: !!data.additionalConditions,
            additionalConditionsLength: data.additionalConditions?.length || 0,
            additionalConditionsPreview: data.additionalConditions?.substring(0, 50),
            clientName: data.clientName,
            checkboxes: {
                correctAuthorisingResolution: data.correctAuthorisingResolution,
                debitOrder: data.debitOrder,
                ficadIdSignatories: data.ficadIdSignatories,
                suretyMembers: data.suretyMembers,
                cancelledCheque: data.cancelledCheque,
                copyLetterhead: data.copyLetterhead,
                contractInstallation: data.contractInstallation,
                insuranceLandlord: data.insuranceLandlord,
                firstRentalPaid: data.firstRentalPaid
            }
        })

        console.log('[approval-letter] Calling buildApprovalPdf...')
        const pdfBytes = await buildApprovalPdf(application, data)
        console.log('[approval-letter] ✓ PDF built successfully, size:', pdfBytes.length, 'bytes')
        const supabase = createServerClient()

        // Add timestamp to ensure fresh PDF and avoid browser cache
        const timestamp = Date.now()
        const fileName = `Approval-Letter-${application.id.slice(0, 8)}-${timestamp}.pdf`
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
            console.error('[approval-letter] ✗ Failed to upload approval letter to storage:', lastError)
            return null
        }

        console.log('[approval-letter] ✓ PDF uploaded successfully to:', publicUrl)

        // Delete any existing approval letter for this application to avoid duplicates
        console.log('[approval-letter] Deleting existing approval letters...')
        const { error: deleteError } = await supabase
            .from('custom_supporting_documents')
            .delete()
            .eq('application_id', application.id)
            .eq('document_type', 'Approval Letter')

        if (deleteError) {
            console.warn('Failed to delete existing approval letter (may not exist):', deleteError)
        } else {
            console.log('[approval-letter] ✓ Deleted existing approval letter entries')
        }

        // Insert the new approval letter
        console.log('[approval-letter] Inserting into supporting_documents table...')
        const insertData = {
            application_id: application.id,
            document_url: publicUrl,
            document_name: fileName,
            document_type: 'Approval Letter',
            uploaded_at: new Date().toISOString()
        }
        console.log('[approval-letter] Insert data:', insertData)

        const { error: dbError } = await supabase
            .from('custom_supporting_documents')
            .insert(insertData)

        if (dbError) {
            console.error('[approval-letter] ✗ Failed to insert approval letter metadata:', dbError)
            console.error('[approval-letter] Database error details:', JSON.stringify(dbError, null, 2))
            return null
        }

        console.log('[approval-letter] ✓ Inserted new approval letter entry successfully')
        console.log('[approval-letter] ===== APPROVAL LETTER GENERATION COMPLETE =====')
        return publicUrl
    } catch (error) {
        console.error('Error generating approval letter:', error)
        return null
    }
}

async function buildApprovalPdf(application: ApplicationRecord, data: ApprovalLetterData) {
    let pdfDoc: PDFDocument

    try {
        console.log('[approval-letter] Loading template:', APPROVAL_TEMPLATE_PATH)
        const templateBytes = await fs.readFile(APPROVAL_TEMPLATE_PATH)
        pdfDoc = await PDFDocument.load(new Uint8Array(templateBytes))

        const form = pdfDoc.getForm()
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // Debug: Log fields to help invalid field naming
        try {
            console.log('[approval-letter] PDF Fields:', form.getFields().map(f => f.getName()))
            console.log('[approval-letter] Data:', data)
        } catch (e) {
            console.warn('[approval-letter] Could not list fields', e)
        }

        const setField = (name: string, value: string) => {
            try {
                const field = form.getTextField(name)
                setTextFieldAutoSized(field, value || '', font)
                console.log(`[approval-letter] ✓ Set field "${name}" = "${value?.substring(0, 50)}..."`)
            } catch (e) {
                console.warn(`[approval-letter] ✗ Failed to set field "${name}":`, (e as Error).message)
            }
        }

        const setCheckbox = (name: string, checked: boolean, alternativeNames: string[] = []) => {
            const namesToTry = [name, ...alternativeNames]

            // Get all available field names for fuzzy matching
            const allFields = form.getFields()
            const allFieldNames = allFields.map(f => f.getName())

            // First, try exact matches
            for (const fieldName of namesToTry) {
                try {
                    const field = form.getCheckBox(fieldName)
                    if (checked) {
                        field.check()
                    } else {
                        field.uncheck()
                    }
                    // CRITICAL: Update appearances so checkboxes show correctly when flattened
                    field.enableReadOnly()
                    field.disableReadOnly()
                    console.log(`[approval-letter] ✓ Set checkbox "${fieldName}" = ${checked}`)
                    return // Success, exit
                } catch (e) {
                    // Try next variation
                }
            }

            // Second, try case-insensitive partial matching on all fields
            const normalizedSearchTerms = namesToTry.map(n => n.toLowerCase().replace(/[^a-z0-9]/g, ''))

            for (const actualFieldName of allFieldNames) {
                const normalizedActual = actualFieldName.toLowerCase().replace(/[^a-z0-9]/g, '')

                // Check if any search term matches the actual field name
                for (let i = 0; i < normalizedSearchTerms.length; i++) {
                    if (normalizedActual.includes(normalizedSearchTerms[i]) || normalizedSearchTerms[i].includes(normalizedActual)) {
                        try {
                            const field = form.getCheckBox(actualFieldName)
                            if (checked) {
                                field.check()
                            } else {
                                field.uncheck()
                            }
                            // CRITICAL: Update appearances so checkboxes show correctly when flattened
                            field.enableReadOnly()
                            field.disableReadOnly()
                            console.log(`[approval-letter] ✓ Set checkbox via fuzzy match "${actualFieldName}" (searched for "${namesToTry[i]}") = ${checked}`)
                            return // Success, exit
                        } catch (e) {
                            // Not a checkbox field, continue
                        }
                    }
                }
            }

            // Third, try text field with checkmark character (exact matches)
            for (const fieldName of namesToTry) {
                try {
                    const textField = form.getTextField(fieldName)
                    textField.setText(checked ? '✓' : '')
                    textField.updateAppearances(font)
                    console.log(`[approval-letter] ✓ Set checkbox text field "${fieldName}" = ${checked ? '✓' : ''}`)
                    return // Success, exit
                } catch (e2) {
                    // Try next variation
                }
            }

            // Fourth, try text field with fuzzy matching
            for (const actualFieldName of allFieldNames) {
                const normalizedActual = actualFieldName.toLowerCase().replace(/[^a-z0-9]/g, '')

                for (let i = 0; i < normalizedSearchTerms.length; i++) {
                    if (normalizedActual.includes(normalizedSearchTerms[i]) || normalizedSearchTerms[i].includes(normalizedActual)) {
                        try {
                            const textField = form.getTextField(actualFieldName)
                            textField.setText(checked ? '✓' : '')
                            textField.updateAppearances(font)
                            console.log(`[approval-letter] ✓ Set checkbox text field via fuzzy match "${actualFieldName}" (searched for "${namesToTry[i]}") = ${checked ? '✓' : ''}`)
                            return // Success, exit
                        } catch (e) {
                            // Not a text field, continue
                        }
                    }
                }
            }

            console.warn(`[approval-letter] ✗ Failed to set checkbox with any variation of "${name}":`, namesToTry)
            console.warn(`[approval-letter] ✗ Available fields in PDF:`, allFieldNames)
        }

        // Map data to EXACT PDF field names (verified via PDF inspection)
        setField('Date', data.date)
        setField('Suppliers email address', data.supplierEmail) // NO apostrophe!
        setField('Supplier', data.supplier)
        setField('Attention', data.attention)
        setField('Client name', data.clientName)
        setField('Reg number  ID no', data.regNumber) // TWO spaces, NO slash!

        // Equipment schedule (single field, no colon)
        setField('Equipment schedule', data.equipmentSchedule)

        // Financials row 1 (exact field names without periods)
        setField('Payout excl Vat', data.payoutExclVat) // No period after "excl"
        setField('Settlement', data.settlement)
        setField('Escalation', data.escalation)

        // Financials row 2
        setField('Rental excl Vat', data.rentalExclVat) // No period after "excl"
        setField('Factor', data.factor)
        setField('Period', data.period)

        // Financials row 3
        setField('Rental Incl Insurance Excl Vat', data.rentalInclInsExclVat)
        setField('Doc fee', data.docFee)

        // Additional conditions (single field)
        setField('Additional conditions', data.additionalConditions)

        // Checkboxes - explicitly set each one (checked or unchecked) using the field names found in the template (Check Box1 - Check Box9)
        // Assumption: IDs are assigned column-wise (Left 1-5, Right 6-9) or row-wise. 
        // Based on typical extraction, we'll try Column-major first (Left 1-5, Right 6-9).
        setCheckbox('Correct authorising resolution', data.correctAuthorisingResolution || false, ['Check Box1', 'Correct Authorising Resolution'])
        setCheckbox('Debit Order', data.debitOrder || false, ['Check Box2', 'Debit order', 'DebitOrder'])
        setCheckbox('Ficad ID of Signatories', data.ficadIdSignatories || false, ['Check Box3', 'Ficad ID of signatories'])
        setCheckbox('Surety of all members or directors', data.suretyMembers || false, ['Check Box4', 'Surety of all Members or Directors'])
        setCheckbox('Copy of cancelled cheque or confirmation from the bank', data.cancelledCheque || false, ['Check Box5', 'Copy of cancelled cheque', 'Cancelled cheque'])

        setCheckbox('Copy letterhead', data.copyLetterhead || false, ['Check Box6', 'Copy Letterhead'])
        setCheckbox('Contract and installation confirmation', data.contractInstallation || false, ['Check Box7', 'Contract and Installation Confirmation'])
        setCheckbox('Insurancelandlord details', data.insuranceLandlord || false, ['Check Box8', 'Insurance/landlord details'])
        setCheckbox('First rental to be paid', data.firstRentalPaid || false, ['Check Box9', 'First Rental to be Paid'])

        console.log('[approval-letter] Checkbox values being set:', {
            correctAuthorisingResolution: data.correctAuthorisingResolution,
            debitOrder: data.debitOrder,
            ficadIdSignatories: data.ficadIdSignatories,
            suretyMembers: data.suretyMembers,
            cancelledCheque: data.cancelledCheque,
            copyLetterhead: data.copyLetterhead,
            contractInstallation: data.contractInstallation,
            insuranceLandlord: data.insuranceLandlord,
            firstRentalPaid: data.firstRentalPaid
        })

        // CRITICAL: Update all field appearances before flattening
        // This ensures checkboxes render correctly in the final PDF
        try {
            form.updateFieldAppearances(font)
            console.log('[approval-letter] ✓ Updated all field appearances before flattening')
        } catch (e) {
            console.warn('[approval-letter] Could not update field appearances:', e)
        }

        form.flatten()
        return pdfDoc.save()
    } catch (error) {
        console.error('[approval-letter] Failed to build PDF from template.', error)
        throw error // Rethrow so we know it failed
    }
}
