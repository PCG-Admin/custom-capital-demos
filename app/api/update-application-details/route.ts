import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { id, document_name } = body

        if (!id || !document_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createServerClient()

        // Try updating rental_credit_applications
        const { data: appData, error: appError } = await supabase
            .from('custom_rental_credit_applications')
            .update({ document_name })
            .eq('id', id)
            .select()

        if (appError) {
            console.error('Error updating application:', appError)
            throw new Error('Database update failed')
        }

        if (!appData || appData.length === 0) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Update application details error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
