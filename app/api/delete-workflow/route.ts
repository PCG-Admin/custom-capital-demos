import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, type } = body

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type !== 'application') {
      return NextResponse.json({ error: 'Only application workflows can be deleted' }, { status: 400 })
    }

    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete workflows
    const isAdmin = user.role.toLowerCase().includes('admin') || user.role.toLowerCase().includes('all access')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = createServerClient()
    const { error } = await supabase
      .from('rental_credit_applications')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[System] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[System] Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
