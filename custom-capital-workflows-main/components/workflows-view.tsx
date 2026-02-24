'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { FileText, FileCheck, ArrowRight, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight, LayoutList, Trash2, Loader2, CircleHelp, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { applicationWorkflowSteps } from '@/lib/workflows'

type TaskItem = {
  id: string
  type: 'application'
  title: string
  subtitle: string
  stepTitle: string
  status: string
  amount?: number | null
  link: string
  createdAt: string
}

interface WorkflowsViewProps {
  activeApplications: any[]
  approvedApplications: any[]
  declinedApplications: any[]
  generatedAgreements: any[]
  myTasks: TaskItem[]
  currentUser?: any
}

const ITEMS_PER_PAGE = 5

export function WorkflowsView({ activeApplications, approvedApplications, declinedApplications, generatedAgreements, myTasks, currentUser }: WorkflowsViewProps) {
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'applications' | 'approved' | 'rejected'>('my-tasks')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const { toast } = useToast()
  const applicationTotalSteps = applicationWorkflowSteps.length

  const [pageMyTasks, setPageMyTasks] = useState(1)
  const [pageApplications, setPageApplications] = useState(1)
  const [pageApproved, setPageApproved] = useState(1)
  const [pageRejected, setPageRejected] = useState(1)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isAdmin = currentUser?.role?.toLowerCase().includes('admin') || currentUser?.role?.toLowerCase().includes('all access')

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) return

    setIsDeleting(id)
    try {
      const response = await fetch('/api/delete-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'application' }),
      })

      if (!response.ok) throw new Error('Delete failed')

      toast({
        title: 'Workflow deleted',
        description: 'The workflow has been permanently removed.',
      })
      
      window.location.reload()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Delete failed',
        description: 'Could not delete the workflow. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleGenerateAgreement = async (id: string) => {
    setGeneratingId(id)
    try {
      const response = await fetch('/api/generate-agreement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate agreement')
      }
      toast({
        title: 'Agreement generated',
        description: 'PDF available for download.',
      })
      window.location.reload()
    } catch (error: any) {
      console.error('[generate-agreement]', error)
      toast({
        title: 'Generation failed',
        description: error?.message || 'Could not generate agreement.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingId(null)
    }
  }

  // Filter function
  const filterItems = (items: any[]) => {
    return items.filter(item => {
      // Search by company name
      if (searchQuery) {
        const businessName = (item.business_name || '').toLowerCase()
        const applicantName = (item.applicant_name || '').toLowerCase()
        const query = searchQuery.toLowerCase()
        if (!businessName.includes(query) && !applicantName.includes(query)) {
          return false
        }
      }

      // Filter by date range
      const itemDate = new Date(item.created_at || item.updated_at)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        if (itemDate < fromDate) return false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999) // End of day
        if (itemDate > toDate) return false
      }

      return true
    })
  }

  const approvedItems = useMemo(() =>
    filterItems(approvedApplications)
      .map(a => ({ ...a, type: 'application', totalSteps: applicationTotalSteps }))
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()),
    [approvedApplications, searchQuery, dateFrom, dateTo]
  )

  const rejectedItems = useMemo(() =>
    filterItems(declinedApplications)
      .map(a => ({ ...a, type: 'application', totalSteps: applicationTotalSteps }))
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()),
    [declinedApplications, searchQuery, dateFrom, dateTo]
  )

  const filteredActiveApplications = useMemo(() =>
    filterItems(activeApplications),
    [activeApplications, searchQuery, dateFrom, dateTo]
  )

  const filteredMyTasks = useMemo(() =>
    filterItems(myTasks),
    [myTasks, searchQuery, dateFrom, dateTo]
  )

  const formatRand = (value?: number | null) => {
    if (value === null || value === undefined) return null
    return `R${Number(value).toLocaleString('en-ZA', { useGrouping: true }).replace(/\s/g, ',')}`
  }

  const formatStableDate = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().slice(0, 10)
  }

  const renderStatusBadge = (status: string, className = '') => {
    const statusLabel = (status || 'pending').replace(/[_-]/g, ' ')
    const normalized = statusLabel.toLowerCase()
    if (normalized === 'approved') {
      return <Badge variant="default" className={cn("bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 capitalize inline-flex", className)}>{statusLabel}</Badge>
    }
    if (normalized === 'declined' || normalized === 'failed' || normalized === 'rejected') {
      return <Badge variant="destructive" className={cn("bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 capitalize inline-flex", className)}>{statusLabel}</Badge>
    }
    if (normalized === 'deferred') {
      return <Badge variant="secondary" className={cn("capitalize inline-flex", className)}>{statusLabel}</Badge>
    }
    if (normalized === 'info requested') {
      return <Badge variant="outline" className={cn("border-amber-500 text-amber-700 bg-amber-50 capitalize inline-flex", className)}>{statusLabel}</Badge>
    }
    return <Badge variant="outline" className={cn("capitalize inline-flex", className)}>{statusLabel}</Badge>
  }

  const calculateProgress = (item: any, totalSteps: number) => {
    let completed = 0
    for (let i = 1; i <= totalSteps; i++) {
      if (item[`step${i}_status`] === 'completed') {
        completed++
      }
    }
    return (completed / totalSteps) * 100
  }

  const getStatusIcon = (status: string) => {
    const normalized = (status || '').toLowerCase().replace(/[_\s]/g, '-')
    switch (normalized) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600/80" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-rose-600/80" />
      case 'info-requested':
        return <CircleHelp className="h-4 w-4 text-amber-600/80" />
      case 'pending':
      case 'deferred':
      case 'in-progress':
        return <Clock className="h-4 w-4 text-slate-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const paginate = <T,>(items: T[], page: number) => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return items.slice(start, start + ITEMS_PER_PAGE)
  }

  const PaginationControls = ({ 
    page, 
    totalItems, 
    setPage 
  }: { 
    page: number, 
    totalItems: number, 
    setPage: (p: number) => void 
  }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const paginatedMyTasks = paginate(filteredMyTasks, pageMyTasks)
  const paginatedApplications = paginate(filteredActiveApplications, pageApplications)
  const paginatedApproved = paginate(approvedItems, pageApproved)
  const paginatedRejected = paginate(rejectedItems, pageRejected)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Active Workflows</h1>
        <p className="text-muted-foreground">
          Track active rental credit applications and access the agreements generated after approval.
        </p>
      </div>

      {/* KPIs Section */}
      <div className="grid gap-6 mb-10 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeApplications.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Approved Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{approvedItems.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {activeApplications.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-xl w-fit border border-slate-200/50">
          <button
            onClick={() => setActiveTab('my-tasks')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
              activeTab === 'my-tasks' 
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" 
                : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
            )}
          >
            <LayoutList className="h-4 w-4" />
            My Tasks
            {myTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5 bg-slate-200/50 text-slate-700 border-0">
                {myTasks.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
              activeTab === 'applications'
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
            )}
          >
            <FileText className="h-4 w-4" />
            Credit Applications
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5 bg-slate-200/50 text-slate-700 border-0">
              {activeApplications.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
              activeTab === 'approved' 
                ? "bg-white text-emerald-900 shadow-sm ring-1 ring-black/5" 
                : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
            )}
          >
            <CheckCircle2 className={cn("h-4 w-4", activeTab === 'approved' ? "text-emerald-600" : "")} />
            Approved
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5 bg-emerald-100/50 text-emerald-700 border-0">
              {approvedItems.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2",
              activeTab === 'rejected' 
                ? "bg-white text-rose-900 shadow-sm ring-1 ring-black/5" 
                : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
            )}
          >
            <XCircle className={cn("h-4 w-4", activeTab === 'rejected' ? "text-rose-600" : "")} />
            Rejected
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5 bg-rose-100/50 text-rose-700 border-0">
              {rejectedItems.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 rounded-lg border bg-white/50 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by company name or applicant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Input
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white w-40"
                placeholder="From date"
              />
            </div>
            <Input
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-white w-40"
              placeholder="To date"
            />
            {(searchQuery || dateFrom || dateTo) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="whitespace-nowrap"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* My Tasks Section */}
      {activeTab === 'my-tasks' && (
        <section className="mb-10 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-foreground hidden">My Tasks</h2>
            <div className="w-full flex justify-end">
               <PaginationControls page={pageMyTasks} totalItems={filteredMyTasks.length} setPage={setPageMyTasks} />
            </div>
          </div>

          {myTasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-2">
                <p className="text-lg font-medium">No Tasks Pending</p>
                <p className="text-sm text-muted-foreground">
                  You're all caught up! New workflows will appear here when they reach your step.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {paginatedMyTasks.map((task) => {
                return (
                  <Card key={`${task.type}-${task.id}`} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between p-6">
                      <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs uppercase tracking-wide text-muted-foreground border px-1.5 py-0.5 rounded">
                                Credit Application
                              </span>
                              <h3 className="text-lg font-semibold truncate text-slate-900">{task.title}</h3>
                              {getStatusIcon(task.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{task.subtitle}</p>
                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {task.stepTitle}
                          </p>
                      </div>

                      <div className="flex items-center gap-4 pl-4">
                          {renderStatusBadge(task.status)}

                         {task.amount !== null && task.amount !== undefined && (
                            <div className="hidden lg:block text-right">
                                <p className="text-sm font-semibold text-slate-900">{formatRand(task.amount)}</p>
                            </div>
                         )}

                             <div className="hidden md:block text-right">
                                <p className="text-xs text-muted-foreground">Stored Date</p>
                                <p className="text-sm font-medium">
                                {formatStableDate(task.createdAt)}
                                </p>
                             </div>

                        <Link href={task.link}>
                              <Button variant="outline" size="sm">
                                  View
                                  <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                          </Link>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Active Applications */}
      {activeTab === 'applications' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-2xl font-semibold text-foreground hidden">Credit Applications</h2>
             <div className="w-full flex justify-end">
               <PaginationControls page={pageApplications} totalItems={filteredActiveApplications.length} setPage={setPageApplications} />
             </div>
          </div>

          {activeApplications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">No active application workflows</p>
                <p className="text-sm text-muted-foreground">
                  All applications have been completed or are awaiting upload
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {paginatedApplications.map((app) => {
                const progress = calculateProgress(app, 6)
                return (
                  <Card key={app.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between p-6">
                        <div className="flex-1 min-w-0 pr-6">
                             <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground border px-1.5 py-0.5 rounded">
                                  Credit Application
                                </span>
                                <h3 className="text-lg font-semibold truncate text-slate-900">{app.applicant_name || app.document_name}</h3>
                                {getStatusIcon(app.status)}
                             </div>
                             <p className="text-sm text-muted-foreground truncate mt-1">Application #{app.id.slice(0, 8)}</p>
                             {app.supplier?.name && (
                               <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center gap-1">
                                 <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                 {app.supplier.name}
                               </p>
                             )}
                        </div>

                        <div className="flex-1 hidden md:block px-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{Math.round(progress)}%</span>
                             </div>
                             <Progress value={progress} className="h-2" />
                             <p className="text-xs text-muted-foreground mt-1">Step {app.current_step} of 6</p>
                        </div>

                        <div className="flex items-center gap-4 pl-4">
                             {renderStatusBadge(app.status)}

                             {app.rental_amount && (
                                <div className="hidden lg:block text-right">
                                    <p className="text-sm font-semibold text-slate-900">{formatRand(Number(app.rental_amount))}</p>
                                </div>
                             )}

                             <div className="hidden md:block text-right">
                                <p className="text-xs text-muted-foreground">Stored Date</p>
                                <p className="text-sm font-medium">
                                    {formatStableDate(app.created_at)}
                                </p>
                             </div>

                             <Link href={`/rental-credit-application/${app.id}`}>
                                <Button size="sm" variant="outline">
                                    View
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>

                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(app.id)}
                                disabled={isDeleting === app.id}
                              >
                                {isDeleting === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                        </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Approved Workflows */}
      {activeTab === 'approved' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
            <h2 className="text-2xl font-semibold text-foreground hidden md:block">Approved Workflows</h2>
            
            <div className="w-full md:w-auto flex justify-end">
              <PaginationControls page={pageApproved} totalItems={approvedItems.length} setPage={setPageApproved} />
            </div>
          </div>

          {approvedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">No approved workflows found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {paginatedApproved.map((item) => {
                const progress = calculateProgress(item, item.totalSteps)
                const title = item.applicant_name || item.document_name
                const subtitle = `Application #${item.id.slice(0, 8)}`
                const hasAgreement = Boolean(item.generated_agreement_url)
                
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500/70">
                    <div className="flex items-center justify-between p-6">
                        <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground border px-1.5 py-0.5 rounded">
                                  Credit Application
                                </span>
                                <h3 className="text-lg font-semibold truncate text-slate-900">{title}</h3>
                                {getStatusIcon(item.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">{subtitle}</p>
                            {item.supplier?.name && (
                              <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {item.supplier.name}
                              </p>
                            )}
                        </div>

                         <div className="flex-1 hidden md:block px-4">
                             <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Completed</span>
                                <span className="font-medium text-emerald-600">100%</span>
                             </div>
                             <Progress value={100} className="h-2 [&>div]:bg-emerald-500/80" />
                             <p className="text-xs text-muted-foreground mt-1">All steps completed</p>
                        </div>

                        <div className="flex items-center gap-4 pl-4">
                             <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 capitalize hidden sm:inline-flex">{item.status}</Badge>

                            {item.rental_amount && (
                                <div className="hidden lg:block text-right">
                                    <p className="text-sm font-semibold text-slate-900">{formatRand(Number(item.rental_amount))}</p>
                                </div>
                             )}

                             <div className="hidden md:block text-right">
                                <p className="text-xs text-muted-foreground">Stored Date</p>
                                <p className="text-sm font-medium">
                                    {formatStableDate(item.created_at)}
                                </p>
                             </div>

                            <Link href={`/rental-credit-application/${item.id}`}>
                              <Button size="sm" variant="outline">
                                View
                                <ArrowRight className="h-4 w-4 ml-2" />
                              </Button>
                            </Link>

                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(item.id)}
                                disabled={isDeleting === item.id}
                              >
                                {isDeleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                        </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Rejected Workflows */}
      {activeTab === 'rejected' && (
        <section className="animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
            <h2 className="text-2xl font-semibold text-foreground hidden md:block">Rejected Workflows</h2>
            
            <div className="w-full md:w-auto flex justify-end">
              <PaginationControls page={pageRejected} totalItems={rejectedItems.length} setPage={setPageRejected} />
            </div>
          </div>

          {rejectedItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-1">No rejected workflows found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {paginatedRejected.map((item) => {
                const isApp = item.type === 'application'
                const title = isApp ? (item.applicant_name || item.document_name) : (item.lessee_name || item.document_name)
                const subtitle = isApp ? `Application #${item.id.slice(0, 8)}` : `Agreement #${item.id.slice(0, 8)}`
                
                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow border-l-4 border-l-rose-500/70">
                    <div className="flex items-center justify-between p-6">
                        <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground border px-1.5 py-0.5 rounded">
                                  {isApp ? 'Credit Application' : 'Rental Agreement'}
                                </span>
                                <h3 className="text-lg font-semibold truncate text-slate-900">{title}</h3>
                                {getStatusIcon(item.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">{subtitle}</p>
                            {item.supplier?.name && (
                              <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                {item.supplier.name}
                              </p>
                            )}
                        </div>

                         <div className="flex-1 hidden md:block px-4">
                             <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Declined</span>
                                <span className="font-medium text-rose-600">100%</span>
                             </div>
                             <Progress value={100} className="h-2 [&>div]:bg-rose-500/80" />
                             <p className="text-xs text-muted-foreground mt-1">Workflow declined</p>
                        </div>

                        <div className="flex items-center gap-4 pl-4">
                             <Badge variant="outline" className="capitalize hidden sm:inline-flex bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200">{item.status}</Badge>

                            {item.rental_amount && (
                                <div className="hidden lg:block text-right">
                                    <p className="text-sm font-semibold text-slate-900">{formatRand(Number(item.rental_amount))}</p>
                                </div>
                             )}

                             <div className="hidden md:block text-right">
                                <p className="text-xs text-muted-foreground">Stored Date</p>
                                <p className="text-sm font-medium">
                                    {formatStableDate(item.created_at)}
                                </p>
                             </div>

                             <Link href={`/rental-credit-application/${item.id}`}>
                                <Button size="sm" variant="outline">
                                    View
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>

                            {isAdmin && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(item.id)}
                                disabled={isDeleting === item.id}
                              >
                                {isDeleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                        </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
