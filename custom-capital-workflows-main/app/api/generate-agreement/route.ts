import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { generateAndStoreRentalAgreement } from '@/lib/rental-agreement-pdf'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, applicationId, mraData } = body || {}

    // Support both 'id' and 'applicationId' for backwards compatibility
    const appId = id || applicationId

    if (!appId) {
      return NextResponse.json({ error: 'Missing application id' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: application, error } = await supabase
      .from('rental_credit_applications')
      .select('*')
      .eq('id', appId)
      .single()

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Allow document generation if workflow is at Step 5 OR already approved
    const isAtStep5 = application.current_step === 5
    const isApproved = (application.status || '').toLowerCase() === 'approved'

    if (!isAtStep5 && !isApproved) {
      return NextResponse.json({ error: 'Documents can only be generated at Step 5 or after approval' }, { status: 400 })
    }

    // If mraData is provided from the dialog, use it; otherwise use application data
    const generated = await generateAndStoreRentalAgreement(application, mraData)

    const { error: updateError } = await supabase
      .from('rental_credit_applications')
      .update({
        generated_agreement_url: generated.url,
        generated_agreement_name: generated.name,
        generated_agreement_number: generated.number,
        generated_agreement_created_at: new Date().toISOString(),
      })
      .eq('id', appId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, agreement: generated })
  } catch (err: any) {
    console.error('[generate-agreement] error', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate agreement' }, { status: 500 })
  }
}
