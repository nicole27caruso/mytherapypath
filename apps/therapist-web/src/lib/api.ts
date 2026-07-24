const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/v1'
export const THERAPIST_ID = 'therapist-1'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API ${options?.method ?? 'GET'} ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export type ApiClient = {
  id: string
  therapist_id: string
  name: string
  age: number | null
  condition: string | null
  status: string
  color: string | null
  frequency: number
  completed_this_week: number
  next_session: string | null
  created_at: string
  program?: { id: string; name: string | null; frequency_per_week: number } | null
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

    create: (body: {
      therapist_id: string; name: string; age: number | null; condition: string | null
      color: string; frequency: number; next_session: string | null; status: string
    }) =>
      request<ApiClient>('/clients', { method: 'POST', body: JSON.stringify(body) }),

    update: (id: string, body: Partial<{
      name: string; age: number; condition: string; status: string
      frequency: number; completed_this_week: number; next_session: string; color: string
    }>) =>
      request<ApiClient>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
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
