import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, Calendar, Clock } from 'lucide-react'
import { RandIcon } from '@/components/rand-icon'

export function AgreementDetails({ agreement }: { agreement: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agreement Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {agreement.agreement_number && (
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Agreement Number</p>
                <p className="font-medium">{agreement.agreement_number}</p>
              </div>
            </div>
          )}
          
          {agreement.lessee_name && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Lessee</p>
                <p className="font-medium">{agreement.lessee_name}</p>
              </div>
            </div>
          )}
          
          {agreement.lessor_name && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Lessor</p>
                <p className="font-medium">{agreement.lessor_name}</p>
              </div>
            </div>
          )}
          
          {agreement.rental_amount && (
            <div className="flex items-center gap-3">
              <RandIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Rental Amount</p>
                <p className="font-medium">R{Number(agreement.rental_amount).toLocaleString('en-ZA')}</p>
              </div>
            </div>
          )}
          
          {agreement.start_date && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{new Date(agreement.start_date).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          
          {agreement.end_date && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{new Date(agreement.end_date).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          {agreement.created_at && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Stored Date</p>
                <p className="font-medium">{new Date(agreement.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
