import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/suppliers - List all suppliers
export async function GET() {
  try {
    // SECURITY: Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[System] Error fetching suppliers:', error)
      return NextResponse.json({ error: 'Failed to fetch suppliers', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ suppliers: data || [] })
  } catch (error) {
    console.error('[System] Fetch suppliers error:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers', details: (error as any)?.message }, { status: 500 })
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { name, description, is_active } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'A supplier with this name already exists' }, { status: 409 })
    }

    // Insert new supplier
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('[System] Error creating supplier:', error)
      return NextResponse.json({ error: 'Failed to create supplier', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, supplier: data })
  } catch (error) {
    console.error('[System] Create supplier error:', error)
    return NextResponse.json({ error: 'Failed to create supplier', details: (error as any)?.message }, { status: 500 })
  }
}
