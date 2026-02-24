import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { canUserActOnStep, getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, type, data } = body || {}

    if (!id || type !== 'application') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Missing extracted data' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: record, error: fetchError } = await supabase
      .from('custom_rental_credit_applications')
      .select('id, current_step, status, step1_status')
      .eq('id', id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const statusLower = (record.status || '').toLowerCase()
    if (['approved', 'declined'].includes(statusLower)) {
      return NextResponse.json({ error: 'Completed workflows cannot be edited' }, { status: 400 })
    }

    // Allow editing on Step 1 and Step 2 only (lock after Step 2 is completed)
    const step1Status = (record.step1_status || '').toLowerCase()
    const currentStep = record.current_step || 1

    if (currentStep > 2 && step1Status === 'completed') {
      return NextResponse.json({ error: 'Extracted data is locked after Step 2' }, { status: 400 })
    }

    const canEdit = canUserActOnStep(user, 'application', currentStep)
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const sanitizedData = JSON.parse(JSON.stringify(data || {}))

    const updatePayload: Record<string, any> = {
      extracted_data: sanitizedData,
      updated_at: new Date().toISOString(),
    }

    // Update top-level denormalized columns for quick access
    updatePayload.applicant_name = sanitizedData.applicant_name ?? null
    updatePayload.applicant_email = sanitizedData.applicant_email ?? null
    updatePayload.applicant_phone = sanitizedData.applicant_phone ?? null
    updatePayload.business_name = sanitizedData.business_name ?? null

    // Handle rental_amount - could be rental_amount or rental_excl_vat
    const rentalAmount = sanitizedData.rental_amount || sanitizedData.rental_excl_vat || null
    updatePayload.rental_amount = rentalAmount

    // Handle rental_term - could be rental_term or payment_period
    const rentalTerm = sanitizedData.rental_term || (sanitizedData.payment_period ? `${sanitizedData.payment_period} months` : null)
    updatePayload.rental_term = rentalTerm

    const { error: updateError } = await supabase
      .from('custom_rental_credit_applications')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    // Revalidate the application page to ensure the UI updates immediately
    revalidatePath(`/rental-credit-application/${id}`)
    revalidatePath('/workflows')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[v0] update-extracted-data error:', error)
    return NextResponse.json(
      { error: 'Failed to update extracted data' },
      { status: 500 }
    )
  }
}
