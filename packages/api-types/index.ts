export interface User {
  id: string;
  role: 'therapist' | 'client';
  name: string;
  email: string;
}

export interface Exercise {
  id: string;
  title: string;
  videoUrl?: string;
  instructions: string;
  durationMinutes: number;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface Assignment {
  id: string;
  exerciseId: string;
  clientId: string;
  therapistId: string;
  frequencyPerWeek: number;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  clientId: string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  submittedAt: string;
  approved: boolean;
  therapistNote?: string;
}

export interface Program {
  id: string;
  name: string;
  therapistId: string;
  clientId: string;
  assignments: Assignment[];
  createdAt: string;
}

export interface ProgramTemplateExercise {
  id: string;
  order: number;
  exerciseId: string;
}

export interface ProgramTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string;
  bodyRegion?: string;
  injuryType?: string;
  functionalFocus?: string;
  recoveryPhase?: string;
  goals?: string;
  ergonomicRecommendations?: string;
  precautions?: string;
  equipmentNeeded?: string;
  progressionCriteria?: string;
  frequencyPerWeek?: number;
  scheduleDays?: string;
  createdAt: string;
  exercises: ProgramTemplateExercise[];
}

export interface WeeklyProgress {
  clientId: string;
  weekStart: string;
  completedCount: number;
  totalCount: number;
  submissions: Submission[];
}
