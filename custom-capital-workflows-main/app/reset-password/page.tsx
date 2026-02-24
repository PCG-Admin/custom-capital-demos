import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Password Assistance</CardTitle>
          <CardDescription>
            Password resets are currently handled by the Custom Capital support team. Use the contact details below to request help.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">Support Email</p>
            <p className="text-muted-foreground">support@customcapital.com</p>
          </div>
          <div>
            <p className="font-medium">Phone</p>
            <p className="text-muted-foreground">+1 (800) 555-0100</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Provide your full name, role, and workflow step so the support desk can verify your account.
            </p>
          </div>
          <Link href="/login">
            <Button variant="secondary">Back to login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
