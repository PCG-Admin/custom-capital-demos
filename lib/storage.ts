type WorkflowDocumentType = 'rental-credit-application' | 'rental-agreement'

// Defaults aligned to the buckets shown by the user (including spaces/casing).
const DEFAULT_BUCKETS: Record<WorkflowDocumentType | 'supporting', string> = {
  'rental-credit-application': 'Credit Applications',
  'rental-agreement': 'Rental Agreements',
  supporting: 'support documents',
}

function bucketCandidates(name: string | undefined, fallbackKey: WorkflowDocumentType | 'supporting') {
  const fallback = DEFAULT_BUCKETS[fallbackKey]
  if (!name || name.trim().length === 0) {
    return [fallback, fallback.toLowerCase(), fallback.replace(/-/g, ' '), fallback.toLowerCase().replace(/-/g, ' '), fallback.replace(/\s+/g, '-').toLowerCase()]
  }

  const cleaned = name.trim()
  const normalized = cleaned.toLowerCase().replace(/\s+/g, '-')
  const spacedFromNormalized = normalized.replace(/-/g, ' ')
  const spacedFromFallback = fallback.replace(/-/g, ' ')
  // Return unique candidates in priority order.
  const candidates = [
    cleaned,
    cleaned.toLowerCase(),
    normalized,
    spacedFromNormalized,
    fallback,
    fallback.toLowerCase(),
    spacedFromFallback,
    fallback.replace(/\s+/g, '-').toLowerCase(),
  ].filter(Boolean)
  return Array.from(new Set(candidates))
}

export function getWorkflowBucketCandidates(type: WorkflowDocumentType) {
  return bucketCandidates(
    type === 'rental-credit-application'
      ? process.env.NEXT_PUBLIC_SUPABASE_APPLICATION_BUCKET
      : process.env.NEXT_PUBLIC_SUPABASE_AGREEMENT_BUCKET,
    type
  )
}

export function getSupportingBucketCandidates() {
  return bucketCandidates(
    process.env.NEXT_PUBLIC_SUPABASE_SUPPORTING_BUCKET,
    'supporting'
  )
}

export function buildStoragePath(prefix: string, originalName: string) {
  const safeName = originalName.replace(/[^\w.\-]+/g, '_')
  return `${prefix}/${Date.now()}-${safeName}`
}
