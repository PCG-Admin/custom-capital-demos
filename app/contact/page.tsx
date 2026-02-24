import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Contact Platform Admin</CardTitle>
          <CardDescription>
            Need access or have questions about workflow permissions? Reach out to the Custom Capital admin team.
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
            <p className="font-medium">Hours</p>
            <p className="text-muted-foreground">Monday – Friday, 8:00am – 6:00pm SAST</p>
          </div>
          <Link href="/login">
            <Button variant="secondary">Back to login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
