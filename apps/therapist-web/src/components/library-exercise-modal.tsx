'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApp } from '@/lib/app-context'
import type { ApiTemplate } from '@/lib/api'
import { X, SquarePlay, Upload, Loader2 } from 'lucide-react'

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export type LibraryExerciseFormValues = {
  title: string
  category: string
  description: string
  typically_used_for: string
  duration_minutes: string
  video_source: 'youtube' | 'upload'
  video_url: string
}

interface LibraryExerciseModalProps {
  open: boolean
  onClose: () => void
  editing?: ApiTemplate | null
  categories: string[]
  onSave: (values: LibraryExerciseFormValues) => Promise<void>
}

const EMPTY: LibraryExerciseFormValues = {
  title: '', category: '', description: '', typically_used_for: '',
  duration_minutes: '', video_source: 'youtube', video_url: '',
}

export function LibraryExerciseModal({ open, onClose, editing, categories, onSave }: LibraryExerciseModalProps) {
  const { uploadLibraryVideo } = useApp()
  const [values, setValues] = useState<LibraryExerciseFormValues>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setValues({
        title: editing.title,
        category: editing.category ?? '',
        description: editing.description ?? '',
        typically_used_for: editing.typically_used_for ?? '',
        duration_minutes: editing.duration_minutes ? String(editing.duration_minutes) : '',
        video_source: editing.video_source === 'upload' ? 'upload' : 'youtube',
        video_url: editing.video_url ?? '',
      })
      setUploadedFileName('')
    } else {
      setValues(EMPTY)
      setUploadedFileName('')
    }
    setUploadError('')
  }, [open, editing])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Video is larger than the 100MB limit.')
      return
    }
    setUploading(true)
    try {
      const { url } = await uploadLibraryVideo(file)
      setValues(prev => ({ ...prev, video_url: url }))
      setUploadedFileName(file.name)
    } catch (err) {
      console.error('Failed to upload video:', err)
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(values)
      onClose()
    } catch (err) {
      console.error('Failed to save exercise:', err)
    } finally {
      setSaving(false)
    }
  }

  const canSave = values.title.trim().length > 0 && !uploading && values.video_url.trim().length > 0

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

          <div className="flex items-center justify-between px-6 py-5 border-b">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{editing ? 'Edit Exercise' : 'Add Exercise'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {editing ? 'Update this exercise library entry.' : 'Add a new exercise to your library.'}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Title <span className="text-red-400">*</span></label>
              <Input
                placeholder="e.g. Median Nerve Glide"
                value={values.title}
                onChange={e => setValues(v => ({ ...v, title: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Category</label>
              <Input
                placeholder="e.g. Wrist & Hand"
                list="library-category-suggestions"
                value={values.category}
                onChange={e => setValues(v => ({ ...v, category: e.target.value }))}
              />
              <datalist id="library-category-suggestions">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={2}
                placeholder="What the exercise covers..."
                value={values.description}
                onChange={e => setValues(v => ({ ...v, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Typically used for</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={2}
                placeholder="Clinical use, e.g. Subacute carpal tunnel syndrome"
                value={values.typically_used_for}
                onChange={e => setValues(v => ({ ...v, typically_used_for: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Duration <span className="text-slate-400 font-normal">(minutes, optional)</span></label>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={values.duration_minutes}
                onChange={e => setValues(v => ({ ...v, duration_minutes: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Video</label>
              <div className="flex rounded-lg border overflow-hidden h-9 mb-3">
                <button
                  onClick={() => setValues(v => ({ ...v, video_source: 'youtube' }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors ${values.video_source === 'youtube' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  <SquarePlay className="w-4 h-4" />
                  YouTube link
                </button>
                <button
                  onClick={() => setValues(v => ({ ...v, video_source: 'upload' }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors border-l ${values.video_source === 'upload' ? 'bg-teal-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  <Upload className="w-4 h-4" />
                  Upload video
                </button>
              </div>

              {values.video_source === 'youtube' ? (
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={values.video_url}
                  onChange={e => setValues(v => ({ ...v, video_url: e.target.value }))}
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-slate-100 file:text-sm file:font-medium hover:file:bg-slate-200"
                  />
                  <p className="text-xs text-slate-400 mt-1">Up to 100MB.</p>
                  {uploading && (
                    <p className="text-xs text-teal-600 flex items-center gap-1.5 mt-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </p>
                  )}
                  {uploadedFileName && !uploading && !uploadError && (
                    <p className="text-xs text-emerald-600 mt-1.5">Uploaded: {uploadedFileName}</p>
                  )}
                  {!uploadedFileName && values.video_url && values.video_source === 'upload' && !uploading && (
                    <p className="text-xs text-emerald-600 mt-1.5">Video attached.</p>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-500 mt-1.5">{uploadError}</p>
                  )}
                </div>
              )}
            </div>

          </div>

          <div className="px-6 py-4 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Exercise'}
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}
