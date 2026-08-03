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
  if (!res.ok) throw new ApiError(`API ${options?.method ?? 'GET'} ${path} → ${res.status}`, res.status)
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
  video_url: string | null
  category: string | null
  duration_minutes: number | null
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

export type ApiProgramTemplateExercise = {
  id: string
  order: number
  template: ApiTemplate
}

export type ApiProgramTemplate = {
  id: string
  title: string
  description: string | null
  category: string | null
  body_region: string | null
  injury_type: string | null
  functional_focus: string | null
  recovery_phase: string | null
  goals: string | null
  ergonomic_recommendations: string | null
  precautions: string | null
  equipment_needed: string | null
  progression_criteria: string | null
  frequency_per_week: number | null
  schedule_days: string | null
  created_at: string
  exercises: ApiProgramTemplateExercise[]
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
  },

  templates: {
    list: () => request<ApiTemplate[]>('/templates'),

    create: (body: {
      title: string; description?: string | null; instructions?: string | null
      video_url?: string | null; category?: string | null; duration_minutes?: number | null
    }) =>
      request<ApiTemplate>('/templates', { method: 'POST', body: JSON.stringify(body) }),
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

  programTemplates: {
    list: () => request<ApiProgramTemplate[]>('/program-templates'),

    create: (body: {
      title: string; description?: string | null; category?: string | null;
      body_region?: string | null; injury_type?: string | null; functional_focus?: string | null;
      recovery_phase?: string | null; goals?: string | null; ergonomic_recommendations?: string | null;
      precautions?: string | null; equipment_needed?: string | null; progression_criteria?: string | null;
      frequency_per_week?: number | null; schedule_days?: string | null; template_ids: string[]
    }) =>
      request<ApiProgramTemplate>('/program-templates', { method: 'POST', body: JSON.stringify(body) }),

    update: (id: string, body: {
      title?: string; description?: string | null; category?: string | null;
      body_region?: string | null; injury_type?: string | null; functional_focus?: string | null;
      recovery_phase?: string | null; goals?: string | null; ergonomic_recommendations?: string | null;
      precautions?: string | null; equipment_needed?: string | null; progression_criteria?: string | null;
      frequency_per_week?: number | null; schedule_days?: string | null; template_ids?: string[]
    }) =>
      request<ApiProgramTemplate>(`/program-templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

    delete: (id: string) =>
      request<void>(`/program-templates/${id}`, { method: 'DELETE' }),
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
