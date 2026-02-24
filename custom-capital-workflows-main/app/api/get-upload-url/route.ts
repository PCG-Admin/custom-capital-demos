
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Require authentication
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fileName, bucketName } = await request.json()

        if (!fileName || !bucketName) {
            return NextResponse.json({ error: 'Missing fileName or bucketName' }, { status: 400 })
        }

        // Validate bucket name to prevent arbitrary access
        const allowedBuckets = [
            process.env.NEXT_PUBLIC_SUPABASE_APPLICATION_BUCKET,
            process.env.NEXT_PUBLIC_SUPABASE_AGREEMENT_BUCKET,
            process.env.NEXT_PUBLIC_SUPABASE_SUPPORTING_BUCKET,
            'Credit Applications',
            'Rental Agreements',
            'support documents'
        ].filter(Boolean)

        if (!allowedBuckets.includes(bucketName)) {
            return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
        }

        const supabase = createServerClient()

        // Create signed upload URL
        // This allows the client to upload specifically to this path without needing broad RLS permissions
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUploadUrl(fileName)

        if (error) {
            console.error('[System] Failed to create signed upload URL:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            signedUrl: data.signedUrl,
            path: data.path,
            token: data.token
        })

    } catch (error: any) {
        console.error('[System] Get upload URL error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
