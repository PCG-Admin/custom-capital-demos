'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'

const statuses = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'declined' },
  { label: 'Deferred', value: 'deferred' },
]

export function SearchInterface() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        q: query,
        status: statusFilter,
      })
      const response = await fetch(`/api/search?${params.toString()}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('[v0] Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by applicant name, email, or business..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <Button type="submit" disabled={isSearching || !query.trim()}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {hasSearched && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {results.length === 0
                ? 'No results found'
                : `Found ${results.length} result${results.length === 1 ? '' : 's'}`}
            </h2>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <Card key={`${result.type}-${result.id}`} className="bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {result.applicant_name || result.document_name}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            Application
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          {result.applicant_email && (
                            <p>Email: {result.applicant_email}</p>
                          )}
                          {result.business_name && (
                            <p>Business: {result.business_name}</p>
                          )}
                          {result.rental_amount && (
                            <p>Amount: R{Number(result.rental_amount).toLocaleString('en-ZA')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        result.status === 'approved' ? 'default' :
                        result.status === 'declined' ? 'destructive' : 'secondary'
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                  <Link href={`/rental-credit-application/${result.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
