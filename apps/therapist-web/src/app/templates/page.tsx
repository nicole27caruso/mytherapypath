'use client'

import { useState } from 'react'
import { templates } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssignDrawer } from '@/components/assign-drawer'
import { NewTemplateModal } from '@/components/new-template-modal'
import { EditTemplateModal, type EditableTemplate } from '@/components/edit-template-modal'
import { Plus, Clock, Repeat2, Users, ChevronRight, Copy, Pencil, Video } from 'lucide-react'

const initialTemplates: EditableTemplate[] = templates.map(t => ({
  ...t,
  exercises: t.exercises.map(name => ({ name, videoUrl: '' })),
}))

export default function TemplatesPage() {
  const [templateList, setTemplateList] = useState<EditableTemplate[]>(initialTemplates)
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null)
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null)

  const editingTemplate = editTemplateId ? templateList.find(t => t.id === editTemplateId) ?? null : null

  function handleSaveEdit(updated: EditableTemplate) {
    setTemplateList(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Program Templates</h1>
          <p className="text-slate-500 mt-1">Save and reuse your favorite home programs</p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 gap-2"
          onClick={() => setShowNewTemplate(true)}
        >
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {templateList.map(template => (
          <Card key={template.id} className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${template.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 leading-tight">{template.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{template.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1">
                  <Repeat2 className="w-3.5 h-3.5" />
                  {template.frequency}x/week
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {template.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {template.ageRange}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                {template.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
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

              <div className="flex items-center justify-between pt-3 border-t">
                <Badge variant="secondary" className="text-xs">
                  Used {template.useCount} times
                </Badge>
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
