import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { canUserActOnStep, getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      applicationId,
      creditScore,
      creditBureau,
      creditReference,
      creditRating,
      creditNotes,
    } = body || {}

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    if (!canUserActOnStep(user, 'application', 2)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = createServerClient()
    const updateData: Record<string, any> = {
      credit_score: creditScore === '' || creditScore === null ? null : Number(creditScore),
      credit_details: {
        bureau: creditBureau || null,
        reference: creditReference || null,
        rating: creditRating || null,
      },
      credit_notes: creditNotes || null,
      credit_checked_at: new Date().toISOString(),
      credit_checked_by: user.full_name || user.email,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('rental_credit_applications')
      .update(updateData)
      .eq('id', applicationId)

    if (error) {
      console.error('[credit-info] Update error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      credit: {
        score: updateData.credit_score,
        details: updateData.credit_details,
        notes: updateData.credit_notes,
        checkedAt: updateData.credit_checked_at,
        checkedBy: updateData.credit_checked_by,
      },
    })
  } catch (error: any) {
    console.error('[credit-info] Handler error:', error)
    return NextResponse.json({ error: 'Failed to save credit info' }, { status: 500 })
  }
}
