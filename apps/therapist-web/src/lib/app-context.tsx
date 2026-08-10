'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { SubmissionEntry } from '@/lib/mock-data'
import type { NewClient } from '@/components/new-client-modal'
import type { ClientProgramState } from '@/components/view-program-drawer'
import { api, THERAPIST_ID, type ApiClient, type ApiProgram, type ApiTemplate, type ApiSubmission } from '@/lib/api'

type ExerciseEntry = { name: string; videoUrl: string; instructions: string; duration: string; frequencyPerWeek: number; minDaysBetween: number }

type LibraryExerciseInput = {
  title: string; description?: string | null; instructions?: string | null;
  typically_used_for?: string | null;
  video_url?: string | null; video_source?: 'youtube' | 'upload' | null;
  category?: string | null; duration_minutes?: number | null;
}

type AppContextValue = {
  clientList: NewClient[]
  clientPrograms: Record<string, ClientProgramState>
  library: ApiTemplate[]
  refreshLibrary: () => Promise<void>
  createLibraryExercise: (body: LibraryExerciseInput & { therapist_id?: string | null }) => Promise<ApiTemplate>
  updateLibraryExercise: (id: string, body: Partial<LibraryExerciseInput>) => Promise<ApiTemplate>
  deleteLibraryExercise: (id: string) => Promise<void>
  uploadLibraryVideo: (file: File) => Promise<{ url: string }>
  submissionList: SubmissionEntry[]
  approved: Set<string>
  rejected: Set<string>
  rejectionNotes: Map<string, string>
  isLoading: boolean
  addClient: (client: NewClient) => Promise<void>
  toggleClientStatus: (id: string) => Promise<void>
  handleAssign: (clientId: string, exercises: ExerciseEntry[], frequency: number, notes: string) => void
  handleSaveProgram: (clientId: string, state: ClientProgramState) => void
  logSession: (clientId: string, exerciseName: string) => Promise<void>
  signOff: (id: string, note: string) => Promise<void>
  reject: (id: string, note: string) => Promise<void>
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

function toNewClient(c: ApiClient): NewClient {
  return {
    id: c.id,
    name: c.name,
    initials: getInitials(c.name),
    age: c.age ?? 0,
    dob: c.dob ?? null,
    condition: c.condition ?? '',
    diagnosis: c.diagnosis ?? '',
    program: c.program?.name ?? 'Program not yet assigned',
    frequency: c.frequency,
    completedThisWeek: c.completed_this_week,
    nextSession: c.next_session ?? '—',
    status: c.status as 'active' | 'inactive',
    lastActivity: '',
    color: c.color ?? 'bg-blue-100 text-blue-700',
    createdAt: c.created_at,
    programCreatedAt: c.program?.created_at ?? undefined,
  }
}

function programToState(prog: ApiProgram): ClientProgramState {
  return {
    exercises: [...prog.exercises]
      .sort((a, b) => a.order - b.order)
      .map(pe => ({
        name: pe.template.title,
        videoUrl: pe.template.video_url ?? '',
        instructions: pe.template.instructions ?? '',
        duration: pe.template.duration_minutes ? `${pe.template.duration_minutes} min` : '',
        frequencyPerWeek: pe.frequency_per_week ?? prog.frequency_per_week,
        minDaysBetween: pe.min_days_between ?? 0,
      })),
    frequency: prog.frequency_per_week,
    notes: prog.notes ?? '',
    schedule: prog.schedule_days ? prog.schedule_days.split(',').filter(Boolean) : [],
  }
}

// Exercises don't carry a template id from the UI, so saving a program means
// resolving each exercise to a backend ExerciseTemplate — reusing one that
// already matches by title (from the shared library or this therapist's own),
// creating a private one-off otherwise — before replacing the program with
// the full resolved list (the API replaces, it doesn't merge).
async function persistProgram(
  clientId: string,
  exercises: ExerciseEntry[],
  frequency: number,
  notes: string,
  schedule: string[]
): Promise<ApiProgram> {
  const existingTemplates = await api.templates.list({ therapistId: THERAPIST_ID })
  const templateByTitle = new Map(existingTemplates.map(t => [t.title.trim().toLowerCase(), t]))

  const templateIds: string[] = []
  const exerciseFrequencies: (number | null)[] = []
  const exerciseMinDays: (number | null)[] = []
  for (const ex of exercises) {
    const key = ex.name.trim().toLowerCase()
    let template = templateByTitle.get(key)
    if (!template) {
      const minutesMatch = ex.duration.match(/\d+/)
      template = await api.templates.create({
        title: ex.name.trim(),
        instructions: ex.instructions || null,
        video_url: ex.videoUrl || null,
        video_source: ex.videoUrl ? 'youtube' : null,
        duration_minutes: minutesMatch ? parseInt(minutesMatch[0], 10) : null,
        therapist_id: THERAPIST_ID, // quick one-off, not added to the shared library
      })
      templateByTitle.set(key, template)
    }
    templateIds.push(template.id)
    exerciseFrequencies.push(ex.frequencyPerWeek ?? null)
    exerciseMinDays.push(ex.minDaysBetween || null)
  }

  return api.programs.save({
    client_id: clientId,
    frequency_per_week: frequency,
    notes: notes || null,
    schedule_days: schedule.length ? schedule.join(',') : null,
    template_ids: templateIds,
    exercise_frequencies: exerciseFrequencies,
    exercise_min_days: exerciseMinDays,
  })
}

function toSubmissionEntry(sub: ApiSubmission, clientsMap: Map<string, ApiClient>): SubmissionEntry {
  const client = clientsMap.get(sub.client_id)
  return {
    id: sub.id,
    clientId: sub.client_id,
    clientName: client?.name ?? 'Unknown',
    clientInitials: client ? getInitials(client.name) : '??',
    clientColor: client?.color ?? 'bg-slate-100 text-slate-600',
    exerciseName: sub.exercise_name,
    date: sub.submitted_at.split('T')[0],
    type: (sub.media_type ?? 'video') as 'video' | 'photo',
    status: sub.status as 'pending' | 'approved' | 'rejected',
    notes: sub.therapist_note ?? '',
    duration: sub.duration ?? '',
    mediaUrl: sub.media_url,
    revisionOf: sub.revision_of_id ?? undefined,
    revisionNumber: sub.revision_number ?? undefined,
  }
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [clientList, setClientList] = useState<NewClient[]>([])
  const [clientPrograms, setClientPrograms] = useState<Record<string, ClientProgramState>>({})
  const [library, setLibrary] = useState<ApiTemplate[]>([])
  const [submissionList, setSubmissionList] = useState<SubmissionEntry[]>([])
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [rejectionNotes, setRejectionNotes] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rawClients, rawSubs, rawLibrary] = await Promise.all([
          api.clients.list(),
          api.submissions.list(),
          api.templates.list({ therapistId: THERAPIST_ID }),
        ])
        const clientsMap = new Map(rawClients.map(c => [c.id, c]))
        setClientList(rawClients.map(toNewClient))
        // Exercise rows created as one-off program entries (no video) aren't library content
        setLibrary(rawLibrary.filter(t => !!t.video_url))

        const programEntries = await Promise.all(
          rawClients.map(async c => [c.id, await api.programs.get(c.id)] as const)
        )
        const programsMap: Record<string, ClientProgramState> = {}
        for (const [id, prog] of programEntries) {
          if (prog) programsMap[id] = programToState(prog)
        }
        setClientPrograms(programsMap)

        const subs = rawSubs.map(s => toSubmissionEntry(s, clientsMap))
        setSubmissionList(subs)
        setApproved(new Set(subs.filter(s => s.status === 'approved').map(s => s.id)))
        setRejected(new Set(subs.filter(s => s.status === 'rejected').map(s => s.id)))
        setRejectionNotes(new Map(
          subs.filter(s => s.status === 'rejected' && s.notes).map(s => [s.id, s.notes])
        ))
      } catch (err) {
        console.error('Failed to load from API:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  async function refreshLibrary() {
    try {
      const rawLibrary = await api.templates.list({ therapistId: THERAPIST_ID })
      setLibrary(rawLibrary.filter(t => !!t.video_url))
    } catch (err) {
      console.error('Failed to load exercise library:', err)
    }
  }

  async function createLibraryExercise(body: LibraryExerciseInput & { therapist_id?: string | null }) {
    const created = await api.templates.create(body)
    if (created.video_url) {
      setLibrary(prev => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)))
    }
    return created
  }

  async function updateLibraryExercise(id: string, body: Partial<LibraryExerciseInput>) {
    const updated = await api.templates.update(id, body)
    setLibrary(prev => updated.video_url
      ? prev.map(t => t.id === id ? updated : t)
      : prev.filter(t => t.id !== id))
    return updated
  }

  async function deleteLibraryExercise(id: string) {
    await api.templates.delete(id)
    setLibrary(prev => prev.filter(t => t.id !== id))
  }

  async function uploadLibraryVideo(file: File) {
    return api.templates.uploadVideo(file)
  }

  async function addClient(client: NewClient) {
    try {
      const created = await api.clients.create({
        therapist_id: THERAPIST_ID,
        name: client.name,
        age: client.age,
        dob: client.dob ?? null,
        condition: client.condition,
        diagnosis: client.diagnosis ?? null,
        color: client.color,
        frequency: client.frequency,
        next_session: client.nextSession === '—' ? null : client.nextSession,
        status: client.status,
      })
      setClientList(prev => [...prev, toNewClient(created)])
    } catch (err) {
      console.error('Failed to create client:', err)
    }
  }

  async function toggleClientStatus(id: string) {
    const client = clientList.find(c => c.id === id)
    if (!client) return
    const newStatus = client.status === 'active' ? 'inactive' : 'active'
    setClientList(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
    try {
      await api.clients.update(id, { status: newStatus })
    } catch (err) {
      console.error('Failed to toggle client status:', err)
      setClientList(prev => prev.map(c => c.id === id ? { ...c, status: client.status } : c))
    }
  }

  function handleAssign(clientId: string, exercises: ExerciseEntry[], frequency: number, notes: string) {
    const schedule = clientPrograms[clientId]?.schedule ?? []
    persistProgram(clientId, exercises, frequency, notes, schedule)
      .then(saved => setClientPrograms(prev => ({ ...prev, [clientId]: programToState(saved) })))
      .catch(err => console.error('Failed to save program:', err))
  }

  function handleSaveProgram(clientId: string, state: ClientProgramState) {
    persistProgram(clientId, state.exercises, state.frequency, state.notes, state.schedule)
      .then(saved => setClientPrograms(prev => ({ ...prev, [clientId]: programToState(saved) })))
      .catch(err => console.error('Failed to save program:', err))
  }

  async function logSession(clientId: string, exerciseName: string) {
    try {
      await api.clients.logSession(clientId, { exercise_name: exerciseName })
    } catch (err) {
      console.error('Failed to log clinic session:', err)
    }
  }

  async function signOff(id: string, note: string) {
    setApproved(prev => new Set([...prev, id]))
    setSubmissionList(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'approved' as const, notes: note } : s)
    )
    try {
      await api.submissions.approve(id, note)
    } catch (err) {
      console.error('Failed to approve submission:', err)
    }
  }

  async function reject(id: string, note: string) {
    setRejected(prev => new Set([...prev, id]))
    setRejectionNotes(prev => new Map([...prev, [id, note]]))
    setSubmissionList(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'rejected' as const, notes: note } : s)
    )
    try {
      await api.submissions.reject(id, note)
    } catch (err) {
      console.error('Failed to reject submission:', err)
    }
  }

  return (
    <AppContext.Provider value={{
      clientList, clientPrograms, library, refreshLibrary, createLibraryExercise, updateLibraryExercise, deleteLibraryExercise, uploadLibraryVideo, submissionList, approved, rejected, rejectionNotes,
      isLoading, addClient, toggleClientStatus, handleAssign, handleSaveProgram, logSession, signOff, reject,
    }}>
      {children}
    </AppContext.Provider>
  )
}

// Sum of each assigned exercise's own weekly target — the real per-client weekly
// target now that frequency lives per-exercise, not once per program.
export function programTarget(prog: ClientProgramState | undefined, fallback: number): number {
  if (!prog || prog.exercises.length === 0) return prog?.frequency ?? fallback
  return prog.exercises.reduce((sum, ex) => sum + (ex.frequencyPerWeek || 0), 0)
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
