'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface DeleteWorkflowButtonProps {
  id: string
  redirectUrl: string
}

export function DeleteWorkflowButton({ id, redirectUrl }: DeleteWorkflowButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) return

    setIsDeleting(true)
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
      
      router.push(redirectUrl)
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Delete failed',
        description: 'Could not delete the workflow. Please try again.',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
      Delete Workflow
    </Button>
  )
}
