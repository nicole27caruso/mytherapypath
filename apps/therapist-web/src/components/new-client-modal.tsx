'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { templates } from '@/lib/mock-data'
import { X } from 'lucide-react'

const CLIENT_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-emerald-100 text-emerald-700',
  'bg-red-100 text-red-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
]

export type NewClient = {
  id: string
  name: string
  initials: string
  age: number
  condition: string
  program: string
  frequency: number
  completedThisWeek: number
  nextSession: string
  status: 'active' | 'inactive'
  lastActivity: string
  color: string
  templateId?: string
}

interface NewClientModalProps {
  open: boolean
  onClose: () => void
  onAdd: (client: NewClient) => void
  existingCount: number
}

export function NewClientModal({ open, onClose, onAdd, existingCount }: NewClientModalProps) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [condition, setCondition] = useState('')
  const [program, setProgram] = useState('')
  const [nextSession, setNextSession] = useState('')
  const [frequency, setFrequency] = useState('3')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [templateId, setTemplateId] = useState<string>('')
  const [saved, setSaved] = useState(false)

  function getInitials(fullName: string) {
    return fullName.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    if (id === 'none') {
      setTemplateId('')
      return
    }
    const t = templates.find(t => t.id === id)
    if (t) {
      if (!program.trim()) setProgram(t.name)
      setFrequency(String(t.frequency))
    }
  }

  function handleClose() {
    setName('')
    setAge('')
    setCondition('')
    setProgram('')
    setNextSession('')
    setFrequency('3')
    setStatus('active')
    setTemplateId('')
    setSaved(false)
    onClose()
  }

  function handleSave() {
    const newClient: NewClient = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      initials: getInitials(name),
      age: parseInt(age) || 0,
      condition: condition.trim(),
      program: program.trim() || (templateId ? templates.find(t => t.id === templateId)?.name ?? 'Program not yet assigned' : 'Program not yet assigned'),
      frequency: parseInt(frequency) || 3,
      completedThisWeek: 0,
      nextSession: nextSession || '—',
      status,
      lastActivity: new Date().toISOString().split('T')[0],
      color: CLIENT_COLORS[existingCount % CLIENT_COLORS.length],
      templateId: templateId || undefined,
    }
    onAdd(newClient)
    setSaved(true)
    setTimeout(() => handleClose(), 1200)
  }

  const canSave = name.trim() && age.trim() && condition.trim()
  const selectedTemplate = templates.find(t => t.id === templateId)

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

          <div className="flex items-center justify-between px-6 py-5 border-b">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Add New Client</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fill in the client&apos;s basic details to get started</p>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name <span className="text-red-400">*</span></label>
              <Input
                placeholder="e.g. Sarah Johnson"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Age <span className="text-red-400">*</span></label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  placeholder="e.g. 8"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Status</label>
                <div className="flex rounded-lg border overflow-hidden h-10">
                  <button
                    onClick={() => setStatus('active')}
                    className={`flex-1 text-sm font-medium transition-colors ${status === 'active' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setStatus('inactive')}
                    className={`flex-1 text-sm font-medium transition-colors border-l ${status === 'inactive' ? 'bg-slate-400 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Condition / Diagnosis <span className="text-red-400">*</span></label>
              <Input
                placeholder="e.g. Fine Motor Skills, Post-Stroke Recovery"
                value={condition}
                onChange={e => setCondition(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                Starting Template <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Select value={templateId || 'none'} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template to start from..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template — start blank</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.frequency}x/week)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="mt-2 px-3 py-2 bg-teal-50 rounded-lg border border-teal-100">
                  <p className="text-xs text-teal-700 font-medium mb-1">{selectedTemplate.exercises.length} exercises included:</p>
                  <p className="text-xs text-teal-600">{selectedTemplate.exercises.join(' · ')}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Program Name <span className="text-slate-400 font-normal">(optional)</span></label>
              <Input
                placeholder="e.g. Pediatric Fine Motor Program"
                value={program}
                onChange={e => setProgram(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Weekly Frequency</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={frequency}
                    onChange={e => setFrequency(e.target.value)}
                    className="text-center"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">x/week</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Next Session</label>
                <Input
                  type="date"
                  value={nextSession}
                  onChange={e => setNextSession(e.target.value)}
                />
              </div>
            </div>

          </div>

          <div className="px-6 py-4 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button
              className={`flex-1 transition-colors ${saved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}
              onClick={handleSave}
              disabled={!canSave}
            >
              {saved ? '✓ Client Added!' : 'Add Client'}
            </Button>
          </div>

        </div>
      </div>
    </>
  )
}
