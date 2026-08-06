'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/app-context'
import { THERAPIST_ID, type ApiTemplate } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AssignDrawer } from '@/components/assign-drawer'
import { LibraryExerciseModal, type LibraryExerciseFormValues } from '@/components/library-exercise-modal'
import { Plus, Clock, Search, Pencil, Trash2, ChevronRight, SquarePlay, Lock } from 'lucide-react'

function youtubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
}

export default function TemplatesPage() {
  const { library, refreshLibrary, createLibraryExercise, updateLibraryExercise, deleteLibraryExercise, handleAssign } = useApp()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignExerciseId, setAssignExerciseId] = useState<string | null>(null)

  const categories = useMemo(
    () => [...new Set(library.map(t => t.category).filter((c): c is string => !!c))].sort(),
    [library]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return library.filter(t => {
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [library, search, categoryFilter])

  const editingExercise = editingId ? library.find(t => t.id === editingId) ?? null : null

  async function handleSave(values: LibraryExerciseFormValues) {
    const body = {
      title: values.title.trim(),
      category: values.category.trim() || null,
      description: values.description.trim() || null,
      typically_used_for: values.typically_used_for.trim() || null,
      duration_minutes: values.duration_minutes ? parseInt(values.duration_minutes, 10) : null,
      video_url: values.video_url.trim() || null,
      video_source: values.video_url.trim() ? values.video_source : null,
    }
    if (editingId) {
      await updateLibraryExercise(editingId, body)
    } else {
      // Therapist-added exercises are private to them, distinct from the shared seeded library
      await createLibraryExercise({ ...body, therapist_id: THERAPIST_ID })
    }
  }

  async function handleDelete(t: ApiTemplate) {
    if (!confirm(`Remove "${t.title}" from the library? This can't be undone.`)) return
    try {
      await deleteLibraryExercise(t.id)
    } catch (err) {
      console.error('Failed to delete exercise:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete exercise.')
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exercise Library</h1>
          <p className="text-slate-500 mt-1">Browse, search, and manage the exercises you assign to clients</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => refreshLibrary()}>
            Refresh
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={() => { setEditingId(null); setShowAdd(true) }}>
            <Plus className="w-4 h-4" />
            Add Exercise
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search exercises..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant={categoryFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setCategoryFilter('all')}
            className={categoryFilter === 'all' ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            All
          </Button>
          {categories.map(c => (
            <Button
              key={c}
              size="sm"
              variant={categoryFilter === c ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(c)}
              className={categoryFilter === c ? 'bg-teal-600 hover:bg-teal-700' : ''}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {filtered.map(exercise => {
          const thumb = exercise.video_url && exercise.video_source === 'youtube' ? youtubeThumbnail(exercise.video_url) : null
          return (
            <Card key={exercise.id} className="hover:shadow-md transition-shadow group overflow-hidden">
              {exercise.video_url && (
                <div className="bg-slate-100">
                  {exercise.video_source === 'upload' ? (
                    <video src={exercise.video_url} controls className="w-full max-h-56 bg-black" />
                  ) : thumb ? (
                    <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="block relative">
                      <img src={thumb} alt={exercise.title} className="w-full h-40 object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                        <SquarePlay className="w-10 h-10 text-white drop-shadow" />
                      </span>
                    </a>
                  ) : (
                    <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-24 text-teal-600 text-sm gap-1.5 hover:underline">
                      <SquarePlay className="w-4 h-4" /> Watch video
                    </a>
                  )}
                </div>
              )}
              <CardHeader className="pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 leading-tight">{exercise.title}</h3>
                    {exercise.therapist_id && (
                      <span title="Private — only visible to you">
                        <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  {exercise.category && (
                    <p className="text-xs text-teal-600 font-medium mt-1">{exercise.category}</p>
                  )}
                  {exercise.description && (
                    <p className="text-sm text-slate-500 mt-1 leading-snug">{exercise.description}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {exercise.typically_used_for && (
                  <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg border">
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Typically used for</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{exercise.typically_used_for}</p>
                  </div>
                )}
                {exercise.duration_minutes && (
                  <span className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <Clock className="w-3.5 h-3.5" />
                    {exercise.duration_minutes} min
                  </span>
                )}

                <div className="flex items-center justify-end pt-3 border-t">
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => { setEditingId(exercise.id); setShowAdd(true) }}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(exercise)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-teal-600 hover:bg-teal-700"
                      onClick={() => setAssignExerciseId(exercise.id)}
                    >
                      Assign
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <p className="font-medium">No exercises match your search.</p>
          <p className="text-sm mt-1">Try a different search term or category, or add a new exercise.</p>
        </div>
      )}

      <AssignDrawer
        key={assignExerciseId}
        open={assignExerciseId !== null}
        onClose={() => setAssignExerciseId(null)}
        preselectedExerciseId={assignExerciseId ?? undefined}
        onAssign={handleAssign}
      />
      <LibraryExerciseModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingId(null) }}
        editing={editingExercise}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  )
}
