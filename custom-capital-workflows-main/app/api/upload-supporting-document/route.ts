import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { buildStoragePath, getSupportingBucketCandidates } from '@/lib/storage'

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const applicationId = formData.get('applicationId') as string | null
        const stepNumber = formData.get('stepNumber') as string
        const docType = formData.get('documentType') as string | null

        if (!file || !applicationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createServerClient()
        const pathPrefix = `applications/${applicationId}`
        const fileName = buildStoragePath(pathPrefix, file.name)

        const bucketCandidates = getSupportingBucketCandidates()
        let publicUrl: string | null = null
        let lastError: any = null

        for (const bucket of bucketCandidates) {
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(fileName, file)

            if (uploadError) {
                lastError = uploadError
                continue
            }

            const { data: urlData, error: urlError } = supabase.storage.from(bucket).getPublicUrl(fileName)
            if (urlError) {
                lastError = urlError
                continue
            }

            publicUrl = urlData.publicUrl
            break
        }

        if (!publicUrl) {
            console.error('Upload error (all buckets failed):', lastError, 'Candidates:', bucketCandidates)
            throw new Error('Failed to upload file to storage')
        }

        // If stepNumber is provided, update the application step notes
        if (stepNumber === '2') {
            const { error: updateError } = await supabase.rpc('append_step_notes', {
                p_application_id: applicationId,
                p_step_number: 2,
                p_note: `\n[Uploaded Credit Report: ${file.name}]`
            })

            if (updateError) {
                const { data: appData } = await supabase
                    .from('rental_credit_applications')
                    .select('step2_notes')
                    .eq('id', applicationId)
                    .single()

                const currentNotes = appData?.step2_notes || ''
                const newNotes = `${currentNotes}\n[Uploaded Credit Report: ${file.name}]`.trim()

                await supabase
                    .from('rental_credit_applications')
                    .update({ step2_notes: newNotes })
                    .eq('id', applicationId)
            }
        }

        const { error: insertError } = await supabase
            .from('supporting_documents')
            .insert({
                application_id: applicationId,
                agreement_id: null,
                document_url: publicUrl,
                document_name: file.name,
                document_type: docType || 'Supporting Document'
            })

        if (insertError) {
            console.error('Database insert error:', insertError)
            throw new Error('Failed to save document metadata')
        }

        return NextResponse.json({ success: true, url: publicUrl })
    } catch (error: any) {
        console.error('Upload handler error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
