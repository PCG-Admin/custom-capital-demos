import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const statusFilter = searchParams.get('status') || 'all'

    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const supabase = createServerClient()
    const searchTerm = `%${query}%`

    const applicationQuery = supabase
      .from('custom_rental_credit_applications')
      .select('*')
      .or(
        `applicant_name.ilike.${searchTerm},applicant_email.ilike.${searchTerm},business_name.ilike.${searchTerm},document_name.ilike.${searchTerm}`
      )

    if (statusFilter !== 'all') {
      applicationQuery.eq('status', statusFilter)
    }

    const { data: applications = [] } = await applicationQuery
      .order('created_at', { ascending: false })
      .limit(20)

    const results = (applications || []).map((app) => ({ ...app, type: 'application' }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('[v0] Search error:', error)
    return NextResponse.json({ results: [] })
  }
}
