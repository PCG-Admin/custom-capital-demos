import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { generateAndStoreFirstRental } from '@/lib/first-rental'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, applicationId, firstRentalData } = body || {}

    // Support both 'id' and 'applicationId' for backwards compatibility
    const appId = id || applicationId

    if (!appId) {
      return NextResponse.json({ error: 'Missing application id' }, { status: 400 })
    }

    if (!firstRentalData) {
      return NextResponse.json({ error: 'Missing first rental data' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: application, error } = await supabase
      .from('custom_rental_credit_applications')
      .select('*')
      .eq('id', appId)
      .single()

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const publicUrl = await generateAndStoreFirstRental(application, firstRentalData)

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to generate first rental document' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err: any) {
    console.error('[generate-first-rental] error', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate first rental document' }, { status: 500 })
  }
}
