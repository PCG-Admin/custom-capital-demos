import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('applicationId')

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Fetch the application to get approval_data
    const { data: application, error } = await supabase
      .from('custom_rental_credit_applications')
      .select('approval_data')
      .eq('id', applicationId)
      .single()

    if (error || !application) {
      console.error('[get-approval-data] Error:', error)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (!application.approval_data) {
      return NextResponse.json({ error: 'No approval data found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      approvalData: application.approval_data
    })
  } catch (error: any) {
    console.error('[get-approval-data] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval data', details: error.message },
      { status: 500 }
    )
  }
}
