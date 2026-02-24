import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { canUserActOnStep, getCurrentUser } from '@/lib/auth'
import { applicationWorkflowSteps } from '@/lib/workflows'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type, stepNumber, status, notes, decision, declineData, approvalData, updateApprovalLetter } = body
    const requestedStatus = typeof status === 'string' ? status.toLowerCase().replace(/-/g, '_') : ''
    const normalizedDecision = typeof decision === 'string' ? decision.toLowerCase() : ''
    const noteText = typeof notes === 'string' ? notes.trim() : ''

    // Debug logging
    if (declineData) {
      console.log('[update-workflow] Received declineData:', declineData)
    }
    if (approvalData) {
      console.log('[update-workflow] Received approvalData for step', stepNumber, ':', Object.keys(approvalData))
    }
    if (stepNumber === 3) {
      console.log('[update-workflow] Step 3 request:', {
        hasApprovalData: !!approvalData,
        updateApprovalLetter,
        status: requestedStatus,
        decision: normalizedDecision
      })
    }

    if (type !== 'application') {
      return NextResponse.json({ error: 'Only application workflows are supported' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canUserActOnStep(user, 'application', stepNumber)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!requestedStatus) {
      return NextResponse.json({ error: 'Missing step status' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: record, error: fetchError } = await supabase
      .from('rental_credit_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !record) {
      console.error('[v0] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (record.status === 'declined') {
      return NextResponse.json({ error: 'Workflow is declined and cannot be modified' }, { status: 400 })
    }

    if ((requestedStatus === 'failed' || requestedStatus === 'info_requested' || normalizedDecision === 'declined') && !noteText) {
      return NextResponse.json({ error: 'A note/comment is required for this action' }, { status: 400 })
    }

    if (requestedStatus === 'completed' && stepNumber > 1) {
      for (let i = 1; i < stepNumber; i++) {
        if (record[`step${i}_status`] !== 'completed') {
          return NextResponse.json(
            { error: `Please complete steps 1 through ${stepNumber - 1} before finishing step ${stepNumber}.` },
            { status: 400 }
          )
        }
      }
    }

    const updateData: Record<string, any> = {
      [`step${stepNumber}_status`]: requestedStatus,
      updated_at: new Date().toISOString(),
    }

    if (noteText) {
      updateData[`step${stepNumber}_notes`] = noteText
    }

    const totalSteps = applicationWorkflowSteps.length

    let shouldGenerateDecline = false

    if (requestedStatus === 'completed') {
      updateData[`step${stepNumber}_completed_at`] = new Date().toISOString()
      updateData[`step${stepNumber}_completed_by`] = user.full_name

      if (stepNumber === totalSteps) {
        updateData.status = 'approved'
        updateData.current_step = totalSteps
      } else {
        // Move to next step if completed
        updateData.current_step = stepNumber + 1
      }
    } else if (requestedStatus === 'failed') {
      // If a step is failed/rejected, we mark the whole workflow as declined
      updateData.status = 'declined'
      updateData[`step${stepNumber}_completed_at`] = new Date().toISOString()
      updateData[`step${stepNumber}_completed_by`] = user.full_name
      updateData.current_step = stepNumber
      shouldGenerateDecline = true
    } else if (requestedStatus === 'info_requested') {
      updateData.status = 'info_requested'
      updateData.current_step = Math.max(1, stepNumber - 1)
      if (stepNumber > 1) {
        updateData[`step${stepNumber - 1}_status`] = 'in_progress'
      }
    }

    if (normalizedDecision) {
      // Only save decision column for step 5 (database only has step5_decision column)
      if (stepNumber === 5) {
        updateData[`step${stepNumber}_decision`] = normalizedDecision
      }
      updateData[`step${stepNumber}_completed_at`] = new Date().toISOString()
      updateData[`step${stepNumber}_completed_by`] = user.full_name

      if (normalizedDecision === 'declined') {
        updateData.status = 'declined'
        updateData.current_step = stepNumber
        shouldGenerateDecline = true
      } else if (normalizedDecision === 'deferred') {
        updateData.status = 'deferred'
        updateData.current_step = stepNumber
      }
      // Note: we do NOT set status to 'approved' here based on decision alone,
      // we wait for all steps to be completed.
    }

    const { error } = await supabase
      .from('rental_credit_applications')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('[v0] Database error:', error)
      throw error
    }

    if (shouldGenerateDecline) {
      // We use the record fetched earlier. 
      // Note: The record might not have the latest notes if they were just added, 
      // but we pass `noteText` explicitly as the reason.
      const { generateAndStoreDeclineLetter } = await import('@/lib/decline-letter')

      // Run as a background promise so we don't block the UI response too long?
      // For reliability, we should probably await it or at least catch errors.
      try {
        console.log('[update-workflow] Generating letter with data:', declineData)
        await generateAndStoreDeclineLetter(record, noteText, declineData)
      } catch (declineError) {
        console.error('[decline-letter] Failed to generate/store decline letter', declineError)
      }
    }

    // Generate Approval Letter for Step 3 (Deal Approval) only, not Step 5
    if (stepNumber === 3 && approvalData && !updateApprovalLetter) {
      const { generateAndStoreApprovalLetter } = await import('@/lib/approval-letter')
      try {
        console.log(`[update-workflow] Generating approval letter for Step ${stepNumber} with data:`, approvalData)
        const approvalUrl = await generateAndStoreApprovalLetter(record, approvalData)

        if (approvalUrl) {
          console.log(`[update-workflow] ✓ Approval letter generated successfully: ${approvalUrl}`)
        } else {
          console.error('[update-workflow] ✗ Approval letter generation returned null')
        }

        // Store approval data in the database for future updates
        const { error: updateError } = await supabase
          .from('rental_credit_applications')
          .update({ approval_data: approvalData })
          .eq('id', id)

        if (updateError) {
          console.error('[update-workflow] ✗ Failed to save approval_data to database:', updateError)
        } else {
          console.log('[update-workflow] ✓ Approval data saved to database')
        }
      } catch (approvalError) {
        console.error('[approval-letter] Failed to generate/store approval letter', approvalError)
        console.error('[approval-letter] Error details:', approvalError instanceof Error ? approvalError.stack : approvalError)
      }
    } else if (stepNumber === 3) {
      console.log('[update-workflow] Skipping approval letter generation:', {
        hasApprovalData: !!approvalData,
        updateApprovalLetter,
        stepNumber
      })
    }

    // Update existing Approval Letter (Step 5)
    if (updateApprovalLetter && approvalData) {
      const { generateAndStoreApprovalLetter } = await import('@/lib/approval-letter')
      try {
        console.log('[update-workflow] Updating approval letter with new data:', approvalData)

        // Regenerate the approval letter with updated data (upsert: true will overwrite)
        await generateAndStoreApprovalLetter(record, approvalData)

        // Update approval data in the database
        await supabase
          .from('rental_credit_applications')
          .update({ approval_data: approvalData })
          .eq('id', id)
      } catch (approvalError) {
        console.error('[approval-letter] Failed to update approval letter', approvalError)
      }
    }

    if (normalizedDecision === 'deferred' && body.deferredData) {
      const { generateAndStoreDeferredLetter } = await import('@/lib/deferred-letter')
      try {
        console.log('[update-workflow] Generating deferred letter with data:', body.deferredData)
        await generateAndStoreDeferredLetter(record, body.deferredData)
      } catch (deferredError) {
        console.error('[deferred-letter] Failed to generate/store deferred letter', deferredError)
      }
    }

    // NOTE: MRA and other documents are now ONLY generated via user-triggered dialogs
    // Auto-generation has been disabled to ensure user explicitly triggers document generation
    // This prevents documents from being created without user interaction

    // REMOVED: Auto-generation of rental agreement
    // All documents (MRA, First Rental, Addendum, Install COA, Insurance,
    // Install Verification, Landlord Consent, Guarantee) are generated individually
    // via user-triggered dialogs in the supporting documents section

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Update error:', error)
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    )
  }
}
