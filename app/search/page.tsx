import { SearchInterface } from '@/components/search-interface'

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-balance mb-2">Search</h1>
        <p className="text-muted-foreground text-pretty">
          Search across all rental credit applications and their generated agreements.
        </p>
      </div>

      <SearchInterface />
    </div>
  )
}
