export type SubmissionEntry = {
  id: string
  clientId: string
  clientName: string
  clientInitials: string
  clientColor: string
  exerciseName: string
  date: string
  type: 'video' | 'photo'
  status: 'pending' | 'approved' | 'rejected'
  notes: string
  duration: string
  mediaUrl: string | null
  revisionOf?: string
  revisionNumber?: number
}
