import { createServerClient } from '@/lib/supabase-server'

export async function getSupportingDocumentsByApplication(id: string) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_supporting_documents')
      .select('*')
      .eq('application_id', id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching supporting docs (application):', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[v0] Failed to fetch supporting docs (application):', error)
    return []
  }
}

export async function getApplications() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_rental_credit_applications')
      .select(`
        *,
        supplier:custom_suppliers(id, name, description)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[v0] Error fetching applications:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[v0] Failed to fetch applications:', error)
    return []
  }
}

export async function getApplicationById(id: string) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_rental_credit_applications')
      .select(`
        *,
        supplier:custom_suppliers(id, name, description, field_hints)
      `)
      .eq('id', id)
      .single()

    if (error) {
      // PGRST116 is the error code for "The result contains 0 rows" when .single() is used
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[v0] Error fetching application:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[v0] Failed to fetch application:', error)
    return null
  }
}

// Supplier management functions

export async function getSuppliers() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('[v0] Error fetching suppliers:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[v0] Failed to fetch suppliers:', error)
    return []
  }
}

export async function getSupplierById(id: string) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_suppliers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[v0] Error fetching supplier:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[v0] Failed to fetch supplier:', error)
    return null
  }
}

export async function getAllSuppliersWithInactive() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('custom_suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[v0] Error fetching all suppliers:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[v0] Failed to fetch all suppliers:', error)
    return []
  }
}
