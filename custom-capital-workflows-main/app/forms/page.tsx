import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, FolderOpen } from 'lucide-react'

export default function FormsPage() {
  const forms = [
    {
      title: 'Rental Credit Application Form',
      description: 'Standard form for new rental credit applications',
      category: 'Applications',
    },
    {
      title: 'Rental Agreement Template',
      description: 'Template for rental agreement contracts',
      category: 'Agreements',
    },
    {
      title: 'Credit Check Authorization',
      description: 'Authorization form for credit checks',
      category: 'Credit',
    },
    {
      title: 'Supporting Documents Checklist',
      description: 'Checklist of required supporting documents',
      category: 'General',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-balance mb-2">Forms & Templates</h1>
        <p className="text-muted-foreground text-pretty">
          Download standard forms and templates for rental finance processes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                  {form.category}
                </span>
              </div>
              <CardTitle className="text-lg">{form.title}</CardTitle>
              <CardDescription>{form.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled>
                <Download className="h-4 w-4 mr-2" />
                Download Form
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-1">Custom Forms</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Contact your administrator to add custom forms and templates specific to your organization
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
