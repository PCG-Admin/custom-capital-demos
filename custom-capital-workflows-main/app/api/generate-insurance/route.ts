import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { generateAndStoreInsurance } from '@/lib/insurance'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, applicationId, insuranceData } = body || {}

    // Support both 'id' and 'applicationId' for backwards compatibility
    const appId = id || applicationId

    if (!appId) {
      return NextResponse.json({ error: 'Missing application id' }, { status: 400 })
    }

    if (!insuranceData) {
      return NextResponse.json({ error: 'Missing insurance data' }, { status: 400 })
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

    const publicUrl = await generateAndStoreInsurance(application, insuranceData)

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to generate insurance agreement' }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (err: any) {
    console.error('[generate-insurance] error', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate insurance' }, { status: 500 })
  }
}
