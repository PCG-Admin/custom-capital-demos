import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, User } from 'lucide-react'
import { getApplications } from '@/lib/data'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RandIcon } from '@/components/rand-icon'

export async function ApplicationList() {
  const applications = await getApplications()

  if (applications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-1">No applications yet</p>
          <p className="text-sm text-muted-foreground">
            Upload your first rental credit application to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Applications</h2>
        <Badge variant="secondary">{applications.length} Total</Badge>
      </div>

      {applications.map((app) => (
        <Card key={app.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {app.applicant_name || app.document_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Application #{app.id.slice(0, 8)}
                </CardDescription>
              </div>
              <Badge
                variant={
                  app.status === 'approved'
                    ? 'default'
                    : app.status === 'declined'
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {app.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              {app.applicant_email && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{app.applicant_email}</span>
                </div>
              )}
              {app.rental_amount && (
                <div className="flex items-center gap-2 text-sm">
                  <RandIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    R{Number(app.rental_amount).toLocaleString('en-ZA')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Link href={`/rental-credit-application/${app.id}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                View Workflow
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
