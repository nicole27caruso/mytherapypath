'use client'

import { useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssignDrawer } from '@/components/assign-drawer'
import { NewTemplateModal } from '@/components/new-template-modal'
import { EditTemplateModal, type EditableTemplate } from '@/components/edit-template-modal'
import { Plus, Clock, Repeat2, ChevronRight, Copy, Pencil, Video } from 'lucide-react'

export default function TemplatesPage() {
  const { programTemplates, refreshProgramTemplates, createProgramTemplate } = useApp()
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null)
  const templateList = useMemo(() => programTemplates.map(t => ({
    id: t.id,
    name: t.title,
    description: t.description ?? '',
    bodyRegion: t.body_region ?? '',
    injuryType: t.injury_type ?? '',
    phase: t.recovery_phase ?? '',
    focus: t.functional_focus ?? '',
    ergonomics: t.ergonomic_recommendations ?? '',
    equipment: t.equipment_needed ?? '',
    precautions: t.precautions ?? '',
    exercises: t.exercises.map(ex => ({
      id: ex.template.id,
      name: ex.template.title,
      videoUrl: ex.template.video_url ?? '',
    })),
    frequency: t.frequency_per_week ?? 0,
    duration: t.schedule_days ?? '',
    ageRange: t.category ?? '',
    useCount: 0,
    color: 'bg-slate-100',
  })), [programTemplates])

  const editingTemplate = editTemplateId ? templateList.find(t => t.id === editTemplateId) ?? null : null

  async function handleRefresh() {
    await refreshProgramTemplates()
  }

  async function resolveExerciseTemplateIds(exercises: { name: string; videoUrl: string }[]) {
    const existingTemplates = await api.templates.list()
    const templateByTitle = new Map(existingTemplates.map(t => [t.title.trim().toLowerCase(), t]))
    const templateIds: string[] = []

    for (const ex of exercises) {
      if (!ex.name.trim()) continue
      const key = ex.name.trim().toLowerCase()
      let exerciseTemplate = templateByTitle.get(key)
      if (!exerciseTemplate) {
        exerciseTemplate = await api.templates.create({
          title: ex.name.trim(),
          description: null,
          instructions: null,
          video_url: ex.videoUrl || null,
          category: null,
          duration_minutes: null,
        })
        templateByTitle.set(key, exerciseTemplate)
      }
      templateIds.push(exerciseTemplate.id)
    }

    return templateIds
  }

  async function handleCreateTemplate(template: EditableTemplate) {
    const templateIds = await resolveExerciseTemplateIds(template.exercises)
    await createProgramTemplate({
      title: template.name,
      description: template.description || null,
      body_region: template.bodyRegion || null,
      injury_type: template.injuryType || null,
      functional_focus: template.focus || null,
      recovery_phase: template.phase || null,
      goals: null,
      ergonomic_recommendations: template.ergonomics || null,
      precautions: template.precautions || null,
      equipment_needed: template.equipment || null,
      progression_criteria: null,
      frequency_per_week: template.frequency || null,
      schedule_days: template.duration || null,
      template_ids: templateIds,
    })
  }

  async function handleSaveEdit(updated: EditableTemplate) {
    try {
      const templateIds = await resolveExerciseTemplateIds(updated.exercises)
      await api.programTemplates.update(updated.id, {
        title: updated.name,
        description: updated.description || null,
        body_region: updated.bodyRegion || null,
        injury_type: updated.injuryType || null,
        functional_focus: updated.focus || null,
        recovery_phase: updated.phase || null,
        ergonomic_recommendations: updated.ergonomics || null,
        precautions: updated.precautions || null,
        equipment_needed: updated.equipment || null,
        frequency_per_week: updated.frequency || null,
        schedule_days: updated.duration || null,
        template_ids: templateIds,
      })
      await refreshProgramTemplates()
    } catch (err) {
      console.error('Failed to update template:', err)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Program Templates</h1>
          <p className="text-slate-500 mt-1">Save and reuse your favorite home programs</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            Refresh
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={() => setShowNewTemplate(true)}>
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {templateList.map(template => (
          <Card key={template.id} className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-3">
              <div>
                <h3 className="font-semibold text-slate-900 leading-tight">{template.name}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-snug">{template.description}</p>
                {(template.ageRange || template.bodyRegion || template.injuryType) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {[template.ageRange, template.bodyRegion, template.injuryType].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
                {template.frequency !== undefined && template.frequency !== null && (
                  <span className="flex items-center gap-1">
                    <Repeat2 className="w-3.5 h-3.5" />
                    {template.frequency}x/week
                  </span>
                )}
                {template.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {template.duration}
                  </span>
                )}
                {template.phase && (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">Phase:</span> {template.phase}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-medium text-slate-700 mb-2">Assigned exercises</h4>
              <div className="space-y-1.5 mb-4">
                {template.exercises.map((ex, i) => (
                  <div key={`${template.id}-${i}`} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    <span className="text-slate-600">{ex.name}</span>
                    {ex.videoUrl && (
                      <a
                        href={ex.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title="Watch tutorial video"
                        className="ml-auto flex-shrink-0"
                      >
                        <Video className="w-3.5 h-3.5 text-teal-500 hover:text-teal-700 transition-colors" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-3 border-t">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setEditTemplateId(template.id)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Copy className="w-3 h-3" />
                    Duplicate
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-teal-600 hover:bg-teal-700"
                    onClick={() => setAssignTemplateId(template.id)}
                  >
                    Assign
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AssignDrawer
        key={assignTemplateId}
        open={assignTemplateId !== null}
        onClose={() => setAssignTemplateId(null)}
        preselectedTemplateId={assignTemplateId ?? undefined}
      />
      <NewTemplateModal
        open={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        onCreate={handleCreateTemplate}
      />
      <EditTemplateModal
        template={editingTemplate}
        open={editTemplateId !== null}
        onClose={() => setEditTemplateId(null)}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
