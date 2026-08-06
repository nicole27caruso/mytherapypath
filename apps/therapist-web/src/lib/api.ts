const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/v1'
export const THERAPIST_ID = 'therapist-1'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.json().then(body => body?.detail).catch(() => null)
    throw new ApiError(detail || `API ${options?.method ?? 'GET'} ${path} → ${res.status}`, res.status)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export type ApiClient = {
  id: string
  therapist_id: string
  name: string
  age: number | null
  dob: string | null
  condition: string | null
  diagnosis: string | null
  status: string
  color: string | null
  frequency: number
  completed_this_week: number
  next_session: string | null
  created_at: string
  program?: { id: string; name: string | null; frequency_per_week: number; created_at: string } | null
}

export type ApiTemplate = {
  id: string
  title: string
  description: string | null
  instructions: string | null
  typically_used_for: string | null
  video_url: string | null
  video_source: 'youtube' | 'upload' | null
  category: string | null
  duration_minutes: number | null
  therapist_id: string | null
  created_at: string
}

export type ApiProgramExercise = {
  id: string
  order: number
  template: ApiTemplate
}

export type ApiProgram = {
  id: string
  client_id: string
  name: string | null
  frequency_per_week: number
  notes: string | null
  schedule_days: string | null
  created_at: string
  exercises: ApiProgramExercise[]
}

export type ApiClinicSession = {
  id: string
  client_id: string
  exercise_name: string
  note: string | null
  session_date: string
  created_at: string
}

export type ApiWeeklyCompletionWeek = {
  week_start: string
  week_end: string
  completed: number
  target: number
}

export type ApiNote = {
  id: string
  client_id: string
  therapist_id: string
  text: string
  created_at: string
}

export type ApiSubmission = {
  id: string
  client_id: string
  exercise_name: string
  media_type: string | null
  media_url: string | null
  status: string
  therapist_note: string | null
  duration: string | null
  submitted_at: string
  revision_of_id: string | null
  revision_number: number | null
}

export const api = {
  clients: {
    list: () =>
      request<ApiClient[]>(`/clients?therapist_id=${THERAPIST_ID}`),

    get: (id: string) =>
      request<ApiClient>(`/clients/${id}`),

    notes: (clientId: string) =>
      request<ApiNote[]>(`/clients/${clientId}/notes`),

    create: (body: {
      therapist_id: string; name: string; age: number | null; dob?: string | null; condition: string | null; diagnosis?: string | null;
      color: string; frequency: number; next_session: string | null; status: string
    }) =>
      request<ApiClient>('/clients', { method: 'POST', body: JSON.stringify(body) }),

    update: (id: string, body: Partial<{
      name: string; age: number; dob: string | null; condition: string; diagnosis: string; status: string
      frequency: number; completed_this_week: number; next_session: string; color: string
    }>) =>
      request<ApiClient>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    logSession: (clientId: string, body: { exercise_name: string; note?: string | null }) =>
      request<ApiClinicSession>(`/clients/${clientId}/sessions`, { method: 'POST', body: JSON.stringify(body) }),

    sessions: (clientId: string) =>
      request<ApiClinicSession[]>(`/clients/${clientId}/sessions`),

    weeklyCompletion: (clientId: string, weeks = 8) =>
      request<ApiWeeklyCompletionWeek[]>(`/clients/${clientId}/weekly-completion?weeks=${weeks}`),
  },

  templates: {
    list: (params?: { therapistId?: string; category?: string; search?: string }) => {
      const q = new URLSearchParams()
      if (params?.therapistId) q.set('therapist_id', params.therapistId)
      if (params?.category) q.set('category', params.category)
      if (params?.search) q.set('search', params.search)
      const qs = q.toString()
      return request<ApiTemplate[]>(`/templates${qs ? `?${qs}` : ''}`)
    },

    create: (body: {
      title: string; description?: string | null; instructions?: string | null
      typically_used_for?: string | null
      video_url?: string | null; video_source?: 'youtube' | 'upload' | null
      category?: string | null; duration_minutes?: number | null
      therapist_id?: string | null
    }) =>
      request<ApiTemplate>('/templates', { method: 'POST', body: JSON.stringify(body) }),

    update: (id: string, body: Partial<{
      title: string; description: string | null; instructions: string | null
      typically_used_for: string | null
      video_url: string | null; video_source: 'youtube' | 'upload' | null
      category: string | null; duration_minutes: number | null
    }>) =>
      request<ApiTemplate>(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    delete: (id: string) =>
      request<void>(`/templates/${id}`, { method: 'DELETE' }),

    uploadVideo: async (file: File): Promise<{ url: string }> => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${BASE}/templates/upload-video`, { method: 'POST', body: formData })
      if (!res.ok) throw new ApiError(`API POST /templates/upload-video → ${res.status}`, res.status)
      return res.json()
    },
  },

  programs: {
    get: async (clientId: string): Promise<ApiProgram | null> => {
      try {
        return await request<ApiProgram>(`/programs/${clientId}`)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }
    },

    save: (body: {
      client_id: string; name?: string | null; frequency_per_week: number
      notes?: string | null; schedule_days?: string | null; template_ids: string[]
    }) =>
      request<ApiProgram>('/programs', { method: 'POST', body: JSON.stringify(body) }),
  },

  submissions: {
    list: () =>
      request<ApiSubmission[]>(`/submissions?therapist_id=${THERAPIST_ID}`),

    approve: (id: string, note: string) =>
      request<ApiSubmission>(`/submissions/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      }),

    reject: (id: string, note: string) =>
      request<ApiSubmission>(`/submissions/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      }),
  },
}
