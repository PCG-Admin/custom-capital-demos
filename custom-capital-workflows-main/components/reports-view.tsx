'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, FileText, CheckCircle, XCircle, Clock, BadgeCheck, LineChart, Building, PieChart, FileCheck } from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'
import { RandIcon } from '@/components/rand-icon'

interface ReportsViewProps {
  applications: any[]
}

export function ReportsView({ applications }: ReportsViewProps) {
  const formatRand = (value: number) =>
    `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const normalizeStatus = (value?: string) => (value || '').toLowerCase()
  const formatStableDate = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toISOString().slice(0, 10)
  }

  // Application metrics
  const totalApplications = applications.length
  const approvedApplications = applications.filter((app) => normalizeStatus(app.status) === 'approved').length
  const declinedApplications = applications.filter((app) => normalizeStatus(app.status) === 'declined').length
  const pendingApplications = applications.filter((app) => {
    const status = normalizeStatus(app.status)
    return status === 'pending' || status === 'deferred' || status === 'info_requested' || status === 'in_progress'
  }).length
  const totalApplicationValue = applications.reduce((sum, app) => sum + (Number(app.rental_amount) || 0), 0)
  const averageApplicationValue = totalApplications ? totalApplicationValue / totalApplications : 0

  // Generated agreement metrics
  const generatedAgreements = applications.filter((app) => Boolean(app.generated_agreement_url))
  const approvedButPendingAgreement = applications.filter(
    (app) => normalizeStatus(app.status) === 'approved' && !app.generated_agreement_url
  ).length
  const inWorkflowApplications = applications.filter((app) => {
    const status = normalizeStatus(app.status)
    return status !== 'approved' && status !== 'declined'
  }).length
  const totalAgreementValue = generatedAgreements.reduce((sum, app) => sum + (Number(app.rental_amount) || 0), 0)
  const liveAgreements = generatedAgreements.length

  const pipelineValue = totalAgreementValue + totalApplicationValue
  
  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6']
  
  const statusData = [
    { name: 'Approved', value: approvedApplications, color: '#10b981' },
    { name: 'Declined', value: declinedApplications, color: '#ef4444' },
    { name: 'Pending', value: pendingApplications, color: '#f59e0b' },
  ].filter(item => item.value > 0)

  const agreementStatusData = [
    { name: 'Generated', value: liveAgreements, color: '#10b981' },
    { name: 'Awaiting Generation', value: approvedButPendingAgreement, color: '#f59e0b' },
    { name: 'In Workflow', value: inWorkflowApplications, color: '#3b82f6' }
  ].filter(item => item.value > 0)

  // Calculate monthly revenue from approved agreements
  const monthlyRevenue = (() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const last6Months: { name: string; value: number; year: number; month: number }[] = []
    
    // Get last 6 months with year and month for matching
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      last6Months.push({
        name: monthNames[date.getMonth()],
        value: 0,
        year: date.getFullYear(),
        month: date.getMonth()
      })
    }

    // Sum revenue from approved agreements by month
    generatedAgreements.forEach((agreement) => {
      if (!agreement.generated_agreement_created_at) return
      const agreementDate = new Date(agreement.generated_agreement_created_at)
      const agreementYear = agreementDate.getFullYear()
      const agreementMonth = agreementDate.getMonth()
      
      // Find the corresponding month in last6Months
      const monthData = last6Months.find(m => m.year === agreementYear && m.month === agreementMonth)
      
      if (monthData) {
        monthData.value += Number(agreement.rental_amount) || 0
      }
    })

    // Remove year and month properties before returning
    return last6Months.map(({ year, month, ...rest }) => rest)
  })()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Track performance metrics and insights across applications and the agreements produced by the workflow.
        </p>
      </div>

      {/* Top Level Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Pipeline Value</p>
              <RandIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{formatRand(pipelineValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined value of applications & generated agreements
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Approval Rate</p>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold">
              {totalApplications > 0 ? Math.round((approvedApplications / totalApplications) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {totalApplications} total applications
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg. Application Size</p>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{formatRand(averageApplicationValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per submitted credit application
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground">Generated Agreements</p>
              <FileCheck className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{liveAgreements}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Agreements created from approved applications
              </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mb-8">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Projected revenue based on generated agreements over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#155e75" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#155e75" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R${value / 1000}k`}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => [`R${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#155e75" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Distribution of application outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {statusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Recent Activity & Top Deals */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Latest submissions needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.slice(0, 5).map((app) => (
                <div key={app.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{app.applicant_name || app.business_name || 'Unnamed Application'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatStableDate(app.created_at)}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{app.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{formatRand(Number(app.rental_amount) || 0)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Agreement Generation Status</CardTitle>
            <CardDescription>Breakdown of generated agreements vs. approvals still pending export</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agreementStatusData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {agreementStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-4">
                {agreementStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
