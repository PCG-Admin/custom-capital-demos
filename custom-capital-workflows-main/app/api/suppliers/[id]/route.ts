import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, is_active, sample_pdf_url, sample_pdf_name, sample_extraction, field_hints } = body

    const supabase = createServerClient()

    // Check if supplier exists
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // If name is being changed, check for duplicates
    if (name && name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('suppliers')
        .select('id')
        .eq('name', name.trim())
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json({ error: 'A supplier with this name already exists' }, { status: 409 })
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (sample_pdf_url !== undefined) updateData.sample_pdf_url = sample_pdf_url
    if (sample_pdf_name !== undefined) updateData.sample_pdf_name = sample_pdf_name
    if (sample_extraction !== undefined) updateData.sample_extraction = sample_extraction
    if (field_hints !== undefined) updateData.field_hints = field_hints

    // Update supplier
    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[System] Error updating supplier:', error)
      return NextResponse.json({ error: 'Failed to update supplier', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, supplier: data })
  } catch (error) {
    console.error('[System] Update supplier error:', error)
    return NextResponse.json({ error: 'Failed to update supplier', details: (error as any)?.message }, { status: 500 })
  }
}

// DELETE /api/suppliers/[id] - Delete supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is admin
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const supabase = createServerClient()

    // Check if supplier is used in any applications
    const { data: applications } = await supabase
      .from('rental_credit_applications')
      .select('id')
      .eq('supplier_id', id)
      .limit(1)

    // If supplier is used, soft delete instead of hard delete
    if (applications && applications.length > 0) {
      const { data, error } = await supabase
        .from('suppliers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[System] Error soft deleting supplier:', error)
        return NextResponse.json({ error: 'Failed to delete supplier', details: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Supplier is used in existing applications and has been deactivated',
        supplier: data
      })
    }

    // Hard delete if not used
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[System] Error deleting supplier:', error)
      return NextResponse.json({ error: 'Failed to delete supplier', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Supplier deleted successfully' })
  } catch (error) {
    console.error('[System] Delete supplier error:', error)
    return NextResponse.json({ error: 'Failed to delete supplier', details: (error as any)?.message }, { status: 500 })
  }
}
