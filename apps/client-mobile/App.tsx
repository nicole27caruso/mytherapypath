import { useState, useRef, useEffect, type ComponentType } from 'react'
import {
  View as RNView,
  Text as RNText,
  ScrollView as RNScrollView,
  TouchableOpacity as RNTouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Image as RNImage,
  Alert,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'

const View = RNView as unknown as ComponentType<any>
const Text = RNText as unknown as ComponentType<any>
const ScrollView = RNScrollView as unknown as ComponentType<any>
const TouchableOpacity = RNTouchableOpacity as unknown as ComponentType<any>
const Image = RNImage as unknown as ComponentType<any>
const ActivityIndicator = RNActivityIndicator as unknown as ComponentType<any>
const AnimatedView = Animated.View as unknown as ComponentType<any>
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as Notifications from 'expo-notifications'

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// ─── API ──────────────────────────────────────────────────────────────────────

const appConfig = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}
const API_BASE = String(appConfig.apiBase ?? 'http://localhost:8000/v1')
const CLIENT_ID = String(appConfig.clientId ?? '1')

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientInfo = {
 name: string
 fullName: string
 age: number
 starsTotal: number
 completedThisWeek: number
 frequency: number
 nextSession?: string | null
}
 
type Exercise = {
 id: string
 name: string
 category: string
 duration: string
 difficulty: string
 color: string
 bgColor: string
 instructions: string[]
 tip: string
 videoUrl?: string
}

type Tab = 'home' | 'progress' | 'messages'
type CapturedMedia = { uri: string; mediaType: 'photo' | 'video' }

function buildSubmissionForm(exerciseName: string, media: CapturedMedia): FormData {
  const form = new FormData()
  form.append('exercise_name', exerciseName)
  form.append('media_type', media.mediaType)
  if (media.uri) {
    const uriFilename = media.uri.split('/').pop() || ''
    const ext = (uriFilename.includes('.') ? uriFilename.split('.').pop() : '') || (media.mediaType === 'photo' ? 'jpg' : 'mp4')
    const name = `proof-${Date.now()}.${ext}`
    const type = media.mediaType === 'photo'
      ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
      : `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`
    form.append('file', { uri: media.uri, name, type } as any)
  }
  return form
}

type MessageItem =
  | { kind: 'note'; id: string; text: string; date: string }
  | { kind: 'approved'; id: string; exercise_name: string; therapist_note: string; date: string }
  | { kind: 'rejected'; id: string; exercise_name: string; rejection_note: string; date: string; has_revision?: boolean }

type RejectionItem = Extract<MessageItem, { kind: 'rejected' }>

// ─── Exercise visual/content details (local — UI presentation only) ───────────

type ExerciseDetails = Omit<Exercise, 'id' | 'name'>

const EXERCISE_DETAILS: Record<string, ExerciseDetails> = {
  'Pinch and Release': {
    category: 'Fine Motor', duration: '5 min', difficulty: 'Easy',
    color: '#818CF8', bgColor: '#EEF2FF',
    instructions: [
      'Sit at a table with a bowl of small objects (coins, buttons, or beads).',
      'Using your thumb and index finger, pick up one object at a time.',
      'Place each object into a second bowl across the table.',
      'Try to complete 3 sets of 10 picks without dropping anything.',
      'Rest for 30 seconds between sets.',
    ],
    tip: 'Keep your elbow close to your body for better control!',
  },
  'Bead Threading': {
    category: 'Fine Motor', duration: '5 min', difficulty: 'Medium',
    color: '#F472B6', bgColor: '#FDF2F8',
    instructions: [
      'Gather your bead kit and a piece of string about 30cm long.',
      'Hold the string with one hand and a bead with the other.',
      'Guide the string through the hole in the bead.',
      'Thread at least 10 beads to complete one set.',
      'Make a pattern with colors if you can!',
    ],
    tip: 'Go slow — accuracy is more important than speed!',
  },
  'Playdough Squeeze': {
    category: 'Grip Strength', duration: '5 min', difficulty: 'Easy',
    color: '#34D399', bgColor: '#ECFDF5',
    instructions: [
      'Take a palm-sized piece of playdough.',
      'Squeeze the playdough firmly with your whole hand for 5 seconds.',
      'Release and spread your fingers wide.',
      'Repeat 10 times, then switch hands.',
      'Try making shapes or animals with the playdough for fun!',
    ],
    tip: 'The harder you squeeze, the stronger your hands get!',
  },
  'Scissors Practice': {
    category: 'Fine Motor', duration: '5 min', difficulty: 'Medium',
    color: '#F59E0B', bgColor: '#FFFBEB',
    instructions: [
      'Place the printed sheet with cut lines on the table in front of you.',
      'Hold child-safe scissors with your dominant hand — thumb on top.',
      'Start with straight lines, cutting all the way across.',
      'Move on to wavy lines once straight cuts feel easy.',
      'Try to stay on the line — ask for help if needed!',
    ],
    tip: 'Keep the paper steady with your other hand while you cut!',
  },
  'Mirror Therapy': {
    category: 'Neurological', duration: '10 min', difficulty: 'Medium',
    color: '#60A5FA', bgColor: '#EFF6FF',
    instructions: [
      'Position the mirror box on the table with the reflective side facing your stronger arm.',
      'Place your affected arm behind the mirror and your stronger arm in front.',
      'Perform slow, symmetrical movements with your stronger arm.',
      'Watch the reflection — your brain sees both arms moving.',
      'Do 3 sets of 10 movements, resting between each.',
    ],
    tip: 'Focus on the reflection, not on your affected arm — that is the key!',
  },
  'Ball Squeeze Series': {
    category: 'Grip Strength', duration: '10 min', difficulty: 'Medium',
    color: '#A78BFA', bgColor: '#F5F3FF',
    instructions: [
      'Choose the therapy ball that feels slightly challenging.',
      'Grip the ball firmly with all five fingers.',
      'Squeeze for 5 seconds, then release completely.',
      'Complete 15 reps per set, with 30-second rest between sets.',
      'Do 3 sets total, then switch hands.',
    ],
    tip: 'If your hand cramps, shake it out gently and rest an extra 30 seconds.',
  },
}

function parseInstructions(raw?: string | null) {
  if (!raw) return []
  return raw
    .split(/\r?\n+/)
    .map(line => line.trim())
    .filter(Boolean)
}

function toExercise(apiEx: {
  id: string
  title: string
  description?: string | null
  instructions?: string | null
  video_url?: string | null
  category?: string | null
  duration_minutes?: number | null
}, index: number): Exercise {
  const details = EXERCISE_DETAILS[apiEx.title]
  const parsedInstructions = parseInstructions(apiEx.instructions ?? details?.instructions.join('\n'))
  return {
    id: apiEx.id,
    name: apiEx.title,
    category: apiEx.category ?? details?.category ?? 'Exercise',
    duration: apiEx.duration_minutes != null ? `${apiEx.duration_minutes} min` : details?.duration ?? '5 min',
    difficulty: details?.difficulty ?? 'Medium',
    color: details?.color ?? '#6366F1',
    bgColor: details?.bgColor ?? '#EEF2FF',
    instructions: parsedInstructions,
    tip: details?.tip ?? 'Follow the therapist’s instructions and take breaks when needed!',
    videoUrl: apiEx.video_url ?? undefined,
  }
}

// ─── Static data ──────────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id: '1', name: '3-Day Streak', emoji: '🔥', earned: true },
  { id: '2', name: 'Perfect Week', emoji: '⭐', earned: true },
  { id: '3', name: 'Speed Star', emoji: '⚡', earned: false },
  { id: '4', name: 'Super Squeezer', emoji: '💪', earned: false },
]

const WEEKLY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// ─── Camera helper ────────────────────────────────────────────────────────────
async function openCameraHelper(
  mediaType: 'photo' | 'video',
  onCapture: (media: CapturedMedia) => void,
) {
  if (Platform.OS === 'web') {
    onCapture({ uri: '', mediaType })
    return
  }
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Camera permission needed', 'Please allow camera access to upload proof.')
    return
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: mediaType === 'photo' ? 'images' : 'videos',
    quality: 0.8,
    videoMaxDuration: 60,
    allowsEditing: false,
  })
  if (!result.canceled && result.assets[0]) {
    onCapture({ uri: result.assets[0].uri, mediaType })
  }
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({
  exercises,
  messages,
  clientInfo,
  completed,
  capturedMedia,
  resubmitted,
  onExercise,
  onRevise,
}: {
  exercises: Exercise[]
  messages: MessageItem[]
  clientInfo: ClientInfo
  completed: Set<string>
  capturedMedia: Record<string, CapturedMedia>
  resubmitted: Set<string>
  onExercise: (ex: Exercise) => void
  onRevise: (rejection: RejectionItem) => void
}) {
  const done = completed.size
  const total = exercises.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const pendingRejections = messages.filter(
    (m): m is RejectionItem => m.kind === 'rejected' && !resubmitted.has(m.id) && !m.has_revision
  )

  const bounceAnimsRef = useRef<Record<string, Animated.Value>>({})
  function getBounceAnim(id: string) {
    if (!bounceAnimsRef.current[id]) {
      bounceAnimsRef.current[id] = new Animated.Value(1)
    }
    return bounceAnimsRef.current[id]
  }

  const celebAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (total > 0 && done === total) {
      celebAnim.setValue(0)
      Animated.sequence([
        Animated.timing(celebAnim, { toValue: 1.15, duration: 350, useNativeDriver: true }),
        Animated.spring(celebAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start()
    }
  }, [done])

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>
      <View style={s.homeHeader}>
        <View>
          <Text style={s.greeting}>Hi {clientInfo.name || 'there'}! 👋</Text>
          <Text style={s.subGreeting}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <View style={s.starBadge}>
          <Text style={s.starEmoji}>⭐</Text>
          <Text style={s.starCount}>{clientInfo.starsTotal}</Text>
        </View>
      </View>

      <View style={s.progressCard}>
        <View style={s.progressHeader}>
          <Text style={s.progressTitle}>Today's Progress</Text>
          <Text style={s.progressPct}>{done}/{total} done</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%` as any }]} />
        </View>
        {done === total && total > 0 && (
          <AnimatedView style={{ transform: [{ scale: celebAnim }] }}>
            <Text style={s.allDone}>🎉 Amazing! You finished all exercises today!</Text>
          </AnimatedView>
        )}
      </View>

      {pendingRejections.length > 0 && (
        <View style={s.attentionSection}>
          <Text style={s.attentionTitle}>⚠️ Needs Your Attention</Text>
          {pendingRejections.map(r => (
            <TouchableOpacity key={r.id} style={s.rejectionCard} onPress={() => onRevise(r)} activeOpacity={0.7}>
              <View style={s.rejectionCardIconWrap}>
                <Text style={s.rejectionCardIcon}>✕</Text>
              </View>
              <View style={s.rejectionCardBody}>
                <Text style={s.rejectionCardName}>{r.exercise_name}</Text>
                <Text style={s.rejectionCardNote} numberOfLines={2}>{r.rejection_note}</Text>
                <Text style={s.rejectionCardDate}>{r.date}</Text>
              </View>
              <Text style={s.rejectionCardArrow}>Revise →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={s.sectionTitle}>Today's Exercises</Text>

      {exercises.map((ex, index) => {
        const isDone = completed.has(ex.id)
        const hasProof = !!capturedMedia[ex.id]
        const bounceAnim = getBounceAnim(ex.id)
        return (
          <View key={ex.id} style={[s.exerciseCard, isDone && s.exerciseCardDone]}>
            <AnimatedView
              style={[s.exerciseDot, { backgroundColor: ex.color, transform: [{ scale: bounceAnim }] }]}
            >
              <Text style={s.exerciseDotText}>{isDone ? '✓' : String(index + 1)}</Text>
            </AnimatedView>

            <View style={s.exerciseInfo}>
              <Text style={[s.exerciseName, isDone && s.doneText]}>{ex.name}</Text>
              <Text style={s.exerciseMeta}>{ex.category} · {ex.duration}</Text>
              <View style={s.badgeRow}>
                <View style={[s.diffBadge, { backgroundColor: ex.bgColor }]}>
                  <Text style={[s.diffText, { color: ex.color }]}>{ex.difficulty}</Text>
                </View>
                {hasProof && (
                  <View style={s.proofBadge}>
                    <Text style={s.proofBadgeText}>📎 Proof uploaded</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.exerciseActions}>
              <TouchableOpacity style={[s.openBtn, isDone && s.openBtnDone]} onPress={() => onExercise(ex)}>
                <Text style={[s.openBtnText, isDone && s.openBtnDoneText]}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}

      <View style={s.encourageBox}>
        <Text style={s.encourageEmoji}>💬</Text>
        <Text style={s.encourageMsg}>
          "You're doing great, {clientInfo.name}! Dr. Kim says keep up the awesome work!"
        </Text>
      </View>
    </ScrollView>
  )
}

// ─── Exercise Detail Screen ───────────────────────────────────────────────────

function ExerciseScreen({
  exercise,
  existingCapture,
  onCapture,
  onBack,
}: {
  exercise: Exercise
  existingCapture: CapturedMedia | null
  onCapture: (exerciseId: string, media: CapturedMedia) => void
  onBack: () => void
}) {
  const [preview, setPreview] = useState<CapturedMedia | null>(existingCapture)
  const [submitted, setSubmitted] = useState(!!existingCapture)
  const submitAnim = useRef(new Animated.Value(submitted ? 1 : 0)).current

  function handleSubmit() {
    if (!preview) return
    onCapture(exercise.id, preview)
    setSubmitted(true)
    Animated.sequence([
      Animated.timing(submitAnim, { toValue: 1.08, duration: 250, useNativeDriver: true }),
      Animated.spring(submitAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start()
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backBtnText}>← Back to Today</Text>
      </TouchableOpacity>

      <View style={[s.videoBox, { backgroundColor: exercise.color }]}>
        <Text style={s.videoIcon}>▶</Text>
        <Text style={s.videoLabel}>{exercise.videoUrl ? 'Watch tutorial video' : 'Tap to play video'}</Text>
        <View style={s.videoBadge}>
          <Text style={s.videoBadgeText}>{exercise.duration}</Text>
        </View>
      </View>

      <Text style={s.exDetailName}>{exercise.name}</Text>

      <View style={s.exMeta}>
        <View style={[s.exMetaChip, { backgroundColor: exercise.bgColor }]}>
          <Text style={[s.exMetaText, { color: exercise.color }]}>{exercise.category}</Text>
        </View>
        <View style={[s.exMetaChip, { backgroundColor: exercise.bgColor }]}>
          <Text style={[s.exMetaText, { color: exercise.color }]}>{exercise.difficulty}</Text>
        </View>
        <View style={[s.exMetaChip, { backgroundColor: exercise.bgColor }]}>
          <Text style={[s.exMetaText, { color: exercise.color }]}>⏱ {exercise.duration}</Text>
        </View>
      </View>

      {exercise.instructions.length > 0 && (
        <>
          <Text style={s.instructTitle}>Instructions</Text>
          {exercise.instructions.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={[s.stepNum, { backgroundColor: exercise.color }]}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </>
      )}

      <View style={[s.tipBox, { backgroundColor: exercise.bgColor, borderColor: exercise.color }]}>
        <Text style={s.tipTitle}>💡 Tip from Dr. Kim</Text>
        <Text style={[s.tipText, { color: exercise.color }]}>{exercise.tip}</Text>
      </View>

      <Text style={s.uploadTitle}>Upload Your Proof</Text>
      <Text style={s.uploadSub}>Show Dr. Kim how well you did!</Text>

      {preview ? (
        <View>
          {preview.mediaType === 'photo' && preview.uri ? (
            <Image source={{ uri: preview.uri }} style={s.previewImage} resizeMode="cover" />
          ) : (
            <View style={[s.previewPlaceholder, { backgroundColor: exercise.color }]}>
              <Text style={s.previewPlaceholderIcon}>
                {preview.mediaType === 'video' ? '🎥' : '📷'}
              </Text>
              <Text style={s.previewPlaceholderLabel}>
                {preview.uri ? 'Video captured' : 'Preview (simulated on web)'}
              </Text>
            </View>
          )}

          {!submitted ? (
            <View style={s.previewActions}>
              <TouchableOpacity style={s.retakeBtn} onPress={() => { setPreview(null); submitAnim.setValue(0) }}>
                <Text style={s.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: exercise.color }]}
                onPress={handleSubmit}
              >
                <Text style={s.submitBtnText}>Submit to Dr. Kim ✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <AnimatedView style={[s.successBox, { backgroundColor: exercise.bgColor,
              transform: [{ scale: submitAnim }] }]}
            >
              <Text style={s.successText}>🌟 Submitted! Dr. Kim will review it soon.</Text>
            </AnimatedView>
          )}
        </View>
      ) : (
        <View style={s.uploadRow}>
          <TouchableOpacity
            style={[s.uploadBtn, { borderColor: exercise.color }]}
            onPress={() => openCameraHelper('photo', media => { setPreview(media); submitAnim.setValue(0) })}
          >
            <Text style={s.uploadBtnEmoji}>📷</Text>
            <Text style={[s.uploadBtnLabel, { color: exercise.color }]}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.uploadBtn, { borderColor: exercise.color }]}
            onPress={() => openCameraHelper('video', media => { setPreview(media); submitAnim.setValue(0) })}
          >
            <Text style={s.uploadBtnEmoji}>🎥</Text>
            <Text style={[s.uploadBtnLabel, { color: exercise.color }]}>Record Video</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

// ─── Revision Screen ──────────────────────────────────────────────────────────

function RevisionScreen({
  rejection,
  exercises,
  onSubmit,
  onBack,
}: {
  rejection: RejectionItem
  exercises: Exercise[]
  onSubmit: (id: string, media: CapturedMedia) => void
  onBack: () => void
}) {
  const exercise = exercises.find(e => e.name === rejection.exercise_name)
  const color = exercise?.color ?? '#6366F1'
  const bgColor = exercise?.bgColor ?? '#EEF2FF'

  const [preview, setPreview] = useState<CapturedMedia | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const submitAnim = useRef(new Animated.Value(0)).current

  function handleSubmit() {
    if (!preview) return
    onSubmit(rejection.id, preview)
    setSubmitted(true)
    Animated.sequence([
      Animated.timing(submitAnim, { toValue: 1.08, duration: 250, useNativeDriver: true }),
      Animated.spring(submitAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start()
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <View style={s.rejNoticeBox}>
        <Text style={s.rejNoticeTitle}>✕ Submission Returned by Dr. Kim</Text>
        <Text style={s.rejNoticeText}>{rejection.rejection_note}</Text>
        <Text style={s.rejNoticeDate}>Returned on {rejection.date}</Text>
      </View>

      <View style={[s.videoBox, { backgroundColor: color }]}>
        <Text style={s.videoIcon}>▶</Text>
        <Text style={s.videoLabel}>Watch tutorial again</Text>
        {exercise && (
          <View style={s.videoBadge}>
            <Text style={s.videoBadgeText}>{exercise.duration}</Text>
          </View>
        )}
      </View>

      <Text style={s.exDetailName}>{rejection.exercise_name}</Text>

      {exercise && exercise.instructions.length > 0 && (
        <>
          <Text style={s.instructTitle}>Instructions</Text>
          {exercise.instructions.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={[s.stepNum, { backgroundColor: color }]}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}

          <View style={[s.tipBox, { backgroundColor: bgColor, borderColor: color }]}>
            <Text style={s.tipTitle}>💡 Tip from Dr. Kim</Text>
            <Text style={[s.tipText, { color }]}>{exercise.tip}</Text>
          </View>
        </>
      )}

      <Text style={s.uploadTitle}>Record Revised Submission</Text>
      <Text style={s.uploadSub}>Show Dr. Kim your improvement!</Text>

      {submitted ? (
        <AnimatedView style={[s.successBox, { backgroundColor: '#ECFDF5', transform: [{ scale: submitAnim }] }]}> 
          <Text style={s.successText}>✅ Revised submission sent! Dr. Kim will review it.</Text>
        </AnimatedView>
      ) : preview ? (
        <View>
          {preview.mediaType === 'photo' && preview.uri ? (
            <Image source={{ uri: preview.uri }} style={s.previewImage} resizeMode="cover" />
          ) : (
            <View style={[s.previewPlaceholder, { backgroundColor: color }]}>
              <Text style={s.previewPlaceholderIcon}>
                {preview.mediaType === 'video' ? '🎥' : '📷'}
              </Text>
              <Text style={s.previewPlaceholderLabel}>
                {preview.uri ? 'Video captured' : 'Preview (simulated on web)'}
              </Text>
            </View>
          )}
          <View style={s.previewActions}>
            <TouchableOpacity style={s.retakeBtn} onPress={() => setPreview(null)}>
              <Text style={s.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.submitBtn, { backgroundColor: color }]} onPress={handleSubmit}>
              <Text style={s.submitBtnText}>Send Revision ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.uploadRow}>
          <TouchableOpacity
            style={[s.uploadBtn, { borderColor: color }]}
            onPress={() => openCameraHelper('photo', setPreview)}
          >
            <Text style={s.uploadBtnEmoji}>📷</Text>
            <Text style={[s.uploadBtnLabel, { color }]}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.uploadBtn, { borderColor: color }]}
            onPress={() => openCameraHelper('video', setPreview)}
          >
            <Text style={s.uploadBtnEmoji}>🎥</Text>
            <Text style={[s.uploadBtnLabel, { color }]}>Record Video</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

// ─── Progress Screen ──────────────────────────────────────────────────────────

function ProgressScreen({ completed, clientInfo }: { completed: Set<string>; clientInfo: ClientInfo }) {
  const todayDayIndex = new Date().getDay()
  const todayLabel = WEEKLY_DAYS[todayDayIndex === 0 ? 6 : todayDayIndex - 1]
  const todayHasActivity = completed.size > 0
  const weeklyTarget = clientInfo.frequency || 3
  const completedThisWeek = clientInfo.completedThisWeek
  const weeklyPct = weeklyTarget > 0 ? Math.round((completedThisWeek / weeklyTarget) * 100) : 0

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>
      <Text style={s.progTitle}>Your Progress ⭐</Text>
      <Text style={s.progSub}>Keep up the great work, {clientInfo.name || 'there'}!</Text>

      <View style={s.starCard}>
        <Text style={s.bigStar}>⭐</Text>
        <Text style={s.bigStarCount}>{clientInfo.starsTotal}</Text>
        <Text style={s.bigStarLabel}>Total Stars Earned</Text>
        <Text style={s.bigStarSub}>You earn 5 stars for every completed exercise!</Text>
      </View>

      <View style={s.weekSummary}>
        <Text style={s.weekSummaryTitle}>This week</Text>
        <Text style={s.weekSummaryText}>{completedThisWeek}/{weeklyTarget} exercises completed</Text>
      </View>

      <Text style={s.sectionTitle}>This Week</Text>
      <View style={s.weekRow}>
        {WEEKLY_DAYS.map(day => {
          const isDone = day === todayLabel && todayHasActivity
          return (
            <View key={day} style={s.dayCol}>
              <View style={[s.dayCircle, isDone ? s.dayDone : s.dayMissed]}>
                <Text style={isDone ? s.dayCheckDone : s.dayCheckMissed}>{isDone ? '✓' : '○'}</Text>
              </View>
              <Text style={[s.dayLabel, day === todayLabel && s.dayLabelToday]}>{day}</Text>
            </View>
          )
        })}
      </View>

      <Text style={s.sectionTitle}>Achievements</Text>
      <View style={s.achGrid}>
        {[
          { id: '1', name: '3-Day Streak', emoji: '🔥', earned: completedThisWeek >= 3 },
          { id: '2', name: 'Perfect Week', emoji: '⭐', earned: completedThisWeek >= weeklyTarget },
          { id: '3', name: 'Proof Uploaded', emoji: '📸', earned: completed.size > 0 },
          { id: '4', name: 'On the Move', emoji: '💪', earned: completedThisWeek > 0 },
        ].map(a => (
          <View key={a.id} style={[s.achCard, !a.earned && s.achLocked]}>
            <Text style={s.achEmoji}>{a.emoji}</Text>
            <Text style={[s.achName, !a.earned && s.achNameLocked]}>{a.name}</Text>
            {!a.earned && <Text style={s.achLockedLabel}>🔒 Locked</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

// ─── Messages Screen ──────────────────────────────────────────────────────────

function MessagesScreen({
  messages,
  resubmitted,
  onRevise,
}: {
  messages: MessageItem[]
  resubmitted: Set<string>
  onRevise: (rejection: RejectionItem) => void
}) {
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>
      <Text style={s.progTitle}>Messages 💬</Text>
      <Text style={s.progSub}>Notes and feedback from Dr. Kim</Text>

      {messages.map(msg => {
        if (msg.kind === 'note') {
          return (
            <View key={msg.id} style={s.msgNote}>
              <View style={s.msgHeader}>
                <Text style={s.msgFrom}>Dr. Kim</Text>
                <Text style={s.msgDate}>{msg.date}</Text>
              </View>
              <Text style={s.msgNoteText}>"{msg.text}"</Text>
            </View>
          )
        }

        if (msg.kind === 'approved') {
          return (
            <View key={msg.id} style={s.msgApproved}>
              <View style={s.msgHeader}>
                <View style={s.msgApprovedRow}>
                  <View style={s.msgApprovedIcon}>
                    <Text style={s.msgApprovedIconText}>✓</Text>
                  </View>
                  <View>
                    <Text style={s.msgApprovedTitle}>Submission Approved</Text>
                    <Text style={s.msgApprovedEx}>{msg.exercise_name}</Text>
                  </View>
                </View>
                <Text style={s.msgDate}>{msg.date}</Text>
              </View>
              {msg.therapist_note ? (
                <Text style={s.msgApprovedNote}>"{msg.therapist_note}"</Text>
              ) : null}
            </View>
          )
        }

        if (msg.kind === 'rejected') {
          const isResubmitted = resubmitted.has(msg.id) || !!msg.has_revision
          return (
            <View key={msg.id} style={[s.msgRejected, isResubmitted && s.msgRejectedResolved]}>
              <View style={s.msgHeader}>
                <View style={s.msgRejectedRow}>
                  <View style={s.msgRejectedIcon}>
                    <Text style={s.msgRejectedIconText}>✕</Text>
                  </View>
                  <View>
                    <Text style={s.msgRejectedTitle}>Submission Returned</Text>
                    <Text style={s.msgRejectedEx}>{msg.exercise_name}</Text>
                  </View>
                </View>
                <Text style={s.msgDate}>{msg.date}</Text>
              </View>
              <Text style={s.msgRejectedNote}>"{msg.rejection_note}"</Text>
              {isResubmitted ? (
                <View style={s.revisedBadge}>
                  <Text style={s.revisedBadgeText}>✓ Revised submission sent for review</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.reviseBtn} onPress={() => onRevise(msg)} activeOpacity={0.7}>
                  <Text style={s.reviseBtnText}>Revise &amp; Resubmit →</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }

        return null
      })}
    </ScrollView>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  pendingRevisions,
  onChange,
}: {
  active: Tab
  pendingRevisions: number
  onChange: (t: Tab) => void
}) {
  const insets = useSafeAreaInsets()
  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'home',     label: 'Today',    emoji: '📋' },
    { key: 'progress', label: 'Progress', emoji: '⭐' },
    { key: 'messages', label: 'Messages', emoji: '💬' },
  ]
  return (
    <View style={[s.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map(tab => {
        const isActive = active === tab.key
        const showBadge = tab.key === 'messages' && pendingRevisions > 0
        return (
          <TouchableOpacity key={tab.key} style={s.tabItem} onPress={() => onChange(tab.key)} activeOpacity={0.7}>
            <View style={s.tabEmojiWrap}>
              <Text style={[s.tabEmoji, isActive && s.tabEmojiActive]}>{tab.emoji}</Text>
              {showBadge && (
                <View style={s.tabBadge}>
                  <Text style={s.tabBadgeText}>{pendingRevisions}</Text>
                </View>
              )}
            </View>
            <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
            {isActive && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ─── App Header ───────────────────────────────────────────────────────────────

function AppHeader({ clientInfo }: { clientInfo: ClientInfo }) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[s.header, { paddingTop: insets.top + 12 }]}>
      <Text style={s.headerTitle}>MyTherapyPath</Text>
      <Text style={s.headerSub}>{clientInfo.fullName}</Text>
    </View>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null)
  const [selectedRevision, setSelectedRevision] = useState<RejectionItem | null>(null)

  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [capturedMedia, setCapturedMedia] = useState<Record<string, CapturedMedia>>({})
  const [resubmitted, setResubmitted] = useState<Set<string>>(new Set())

  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '', fullName: '', age: 0, starsTotal: 0,
    completedThisWeek: 0,
    frequency: 3,
    nextSession: null,
  })
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  async function loadDashboard() {
    try {
      const res = await fetch(`${API_BASE}/mobile/${CLIENT_ID}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const loadedExercises: Exercise[] = data.exercises.map((e: any, i: number) => toExercise(e, i))
      const submittedNames = new Set<string>(
        (data.submitted_exercises ?? []).map((item: any) => item.exercise_name)
      )

      setClientInfo({
        name: data.client.name,
        fullName: data.client.full_name,
        age: data.client.age ?? 0,
        starsTotal: data.client.stars_total ?? 0,
        completedThisWeek: data.client.completed_this_week ?? 0,
        frequency: data.client.frequency ?? 3,
        nextSession: data.client.next_session ?? null,
      })
      setExercises(loadedExercises)
      setMessages(data.messages as MessageItem[])
      setCompleted(new Set(loadedExercises.filter(ex => submittedNames.has(ex.name)).map(ex => ex.id)))
      setCapturedMedia(
        Object.fromEntries(
          loadedExercises
            .filter(ex => submittedNames.has(ex.name))
            .map(ex => {
              const submission = data.submitted_exercises.find((item: any) => item.exercise_name === ex.name)
              return [ex.id, {
                uri: submission?.media_url ?? '',
                mediaType: (submission?.media_type as 'photo' | 'video') ?? 'photo',
              }]
            })
        )
      )

      // Pre-populate resubmitted set from server data
      const alreadyRevised = new Set<string>(
        (data.messages as MessageItem[])
          .filter((m): m is RejectionItem => m.kind === 'rejected' && !!m.has_revision)
          .map(m => m.id)
      )
      setResubmitted(alreadyRevised)
    } catch (err) {
      console.error('Failed to load from API — using defaults:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    scheduleReminder()
  }, [])

  async function scheduleReminder() {
    if (Platform.OS === 'web') return
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status !== 'granted') return
      await Notifications.cancelAllScheduledNotificationsAsync()
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for exercises, ${clientInfo.name}! ⭐`,
          body: "Dr. Kim has exercises waiting. Let's go!",
        },
        trigger: { hour: 16, minute: 0, repeats: true } as any,
      })
    } catch {
      // Notifications unavailable in this environment
    }
  }

  async function handleCapture(exerciseId: string, media: CapturedMedia) {
    setCapturedMedia(prev => ({ ...prev, [exerciseId]: media }))
    const ex = exercises.find(e => e.id === exerciseId)
    if (!ex) return
    try {
      const res = await fetch(`${API_BASE}/mobile/${CLIENT_ID}/submit`, {
        method: 'POST',
        body: buildSubmissionForm(ex.name, media),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCompleted(prev => new Set(prev).add(exerciseId))
      await loadDashboard()
    } catch (err) {
      console.error('Failed to record submission:', err)
    }
  }

  async function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setSelectedEx(null)
    setSelectedRevision(null)
    setIsLoading(true)
    await loadDashboard()
  }

  function handleRevise(rejection: RejectionItem) {
    setSelectedRevision(rejection)
  }

  async function handleRevisionSubmit(rejectionId: string, media: CapturedMedia) {
    setResubmitted(prev => new Set([...prev, rejectionId]))
    setTimeout(() => setSelectedRevision(null), 1800)
    const rejection = messages.find(
      (m): m is RejectionItem => m.kind === 'rejected' && m.id === rejectionId
    )
    try {
      const res = await fetch(`${API_BASE}/mobile/submissions/${rejectionId}/resubmit`, {
        method: 'POST',
        body: buildSubmissionForm(rejection?.exercise_name ?? '', media),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await loadDashboard()
    } catch (err) {
      console.error('Failed to record resubmission:', err)
    }
  }

  const pendingRevisions = messages.filter(
    (m): m is RejectionItem =>
      m.kind === 'rejected' && !resubmitted.has(m.id) && !m.has_revision
  ).length

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={s.loadingScreen}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={s.loadingText}>Loading your exercises…</Text>
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={s.root}>
        <AppHeader clientInfo={clientInfo} />

        <View style={s.body}>
          {selectedRevision ? (
            <RevisionScreen
              rejection={selectedRevision}
              exercises={exercises}
              onSubmit={handleRevisionSubmit}
              onBack={() => setSelectedRevision(null)}
            />
          ) : activeTab === 'home' && selectedEx ? (
            <ExerciseScreen
              exercise={selectedEx}
              existingCapture={capturedMedia[selectedEx.id] ?? null}
              onCapture={handleCapture}
              onBack={() => setSelectedEx(null)}
            />
          ) : activeTab === 'home' ? (
            <HomeScreen
              exercises={exercises}
              messages={messages}
              clientInfo={clientInfo}
              completed={completed}
              capturedMedia={capturedMedia}
              resubmitted={resubmitted}
              onExercise={ex => setSelectedEx(ex)}
              onRevise={handleRevise}
            />
          ) : activeTab === 'progress' ? (
            <ProgressScreen completed={completed} clientInfo={clientInfo} />
          ) : (
            <MessagesScreen messages={messages} resubmitted={resubmitted} onRevise={handleRevise} />
          )}
        </View>

        <TabBar active={activeTab} pendingRevisions={pendingRevisions} onChange={handleTabChange} />
      </View>
    </SafeAreaProvider>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#6366F1'
const PURPLE_LIGHT = '#EEF2FF'
const RED = '#EF4444'
const RED_LIGHT = '#FEF2F2'
const GREEN = '#059669'
const GREEN_LIGHT = '#ECFDF5'

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    maxWidth: 430,
    alignSelf: 'center',
    width: '100%',
    ...(Platform.OS === 'web' ? { boxShadow: '0 0 40px rgba(0,0,0,0.12)' } as any : {}),
  },
  header: {
    backgroundColor: PURPLE,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },

  body: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  screenContent: { padding: 16, paddingBottom: 24 },

  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#64748B' },

  // Home
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
  subGreeting: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  starBadge: {
    backgroundColor: '#FEF9C3', borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  starEmoji: { fontSize: 16 },
  starCount: { fontSize: 16, fontWeight: '700', color: '#A16207' },

  progressCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#334155' },
  progressPct: { fontSize: 14, fontWeight: '700', color: PURPLE },
  progressBar: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 4 },
  allDone: { marginTop: 10, textAlign: 'center', color: '#059669', fontWeight: '600', fontSize: 13 },

  // Needs Attention
  attentionSection: { marginBottom: 20 },
  attentionTitle: { fontSize: 14, fontWeight: '700', color: '#B45309', marginBottom: 8 },
  rejectionCard: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  rejectionCardIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rejectionCardIcon: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectionCardBody: { flex: 1 },
  rejectionCardName: { fontSize: 14, fontWeight: '700', color: '#7F1D1D' },
  rejectionCardNote: { fontSize: 12, color: '#991B1B', marginTop: 2, lineHeight: 17 },
  rejectionCardDate: { fontSize: 11, color: '#B91C1C', marginTop: 3 },
  rejectionCardArrow: { fontSize: 12, fontWeight: '700', color: RED, flexShrink: 0 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10, marginTop: 4 },

  exerciseCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  exerciseCardDone: { opacity: 0.7 },
  exerciseDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  exerciseDotText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  exerciseMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  doneText: { textDecorationLine: 'line-through', color: '#94A3B8' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  diffBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  diffText: { fontSize: 11, fontWeight: '600' },
  proofBadge: { backgroundColor: '#D1FAE5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  proofBadgeText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  exerciseActions: { gap: 6, alignItems: 'flex-end' },
  openBtn: { backgroundColor: PURPLE_LIGHT, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  openBtnDone: { backgroundColor: '#D1FAE5' },
  openBtnText: { color: PURPLE, fontSize: 12, fontWeight: '700' },
  openBtnDoneText: { color: '#059669' },
  encourageBox: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 14,
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  encourageEmoji: { fontSize: 22 },
  encourageMsg: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 19, fontStyle: 'italic' },

  // Exercise / Revision detail shared
  backBtn: { marginBottom: 12 },
  backBtnText: { color: PURPLE, fontSize: 15, fontWeight: '600' },
  videoBox: {
    borderRadius: 20, height: 200, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, position: 'relative',
  },
  videoIcon: { fontSize: 48, color: 'rgba(255,255,255,0.9)' },
  videoLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  videoBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  videoBadgeText: { color: '#fff', fontSize: 12 },
  exDetailName: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  exMeta: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  exMetaChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  exMetaText: { fontSize: 12, fontWeight: '600' },
  instructTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 20 },
  tipBox: { borderRadius: 12, padding: 14, borderLeftWidth: 3, marginBottom: 20, marginTop: 8 },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 19 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  uploadSub: { fontSize: 13, color: '#94A3B8', marginBottom: 14 },
  uploadRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  uploadBtn: {
    flex: 1, borderWidth: 2, borderRadius: 16, borderStyle: 'dashed',
    paddingVertical: 20, alignItems: 'center', gap: 6,
  },
  uploadBtnEmoji: { fontSize: 28 },
  uploadBtnLabel: { fontSize: 13, fontWeight: '600' },
  previewImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 12 },
  previewPlaceholder: {
    width: '100%', height: 220, borderRadius: 16, marginBottom: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  previewPlaceholderIcon: { fontSize: 48 },
  previewPlaceholderLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 8 },
  previewActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  retakeBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#CBD5E1',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  retakeBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  submitBtn: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  successBox: { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  successText: { fontSize: 14, fontWeight: '600', color: '#059669', textAlign: 'center' },

  // Revision notice
  rejNoticeBox: {
    backgroundColor: RED_LIGHT, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FECACA', borderLeftWidth: 3, borderLeftColor: RED,
    marginBottom: 20,
  },
  rejNoticeTitle: { fontSize: 14, fontWeight: '700', color: '#7F1D1D', marginBottom: 6 },
  rejNoticeText: { fontSize: 13, color: '#991B1B', lineHeight: 19, fontStyle: 'italic' },
  rejNoticeDate: { fontSize: 11, color: '#B91C1C', marginTop: 8 },

  // Progress
  progTitle: { fontSize: 24, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  progSub: { fontSize: 14, color: '#94A3B8', marginBottom: 20 },
  starCard: {
    backgroundColor: PURPLE, borderRadius: 24, padding: 28,
    alignItems: 'center', marginBottom: 24,
  },
  bigStar: { fontSize: 52, marginBottom: 8 },
  bigStarCount: { fontSize: 52, fontWeight: '700', color: '#fff' },
  bigStarLabel: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginTop: 4 },
  bigStarSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, textAlign: 'center' },
  weekSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  weekSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4 },
  weekSummaryText: { fontSize: 15, color: '#475569' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  dayCol: { alignItems: 'center', gap: 6 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: GREEN },
  dayMissed: { backgroundColor: '#E2E8F0' },
  dayCheckDone: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dayCheckMissed: { color: '#94A3B8', fontSize: 16 },
  dayLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  dayLabelToday: { color: PURPLE, fontWeight: '700' },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  achCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '47%',
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  achLocked: { opacity: 0.5 },
  achEmoji: { fontSize: 32 },
  achName: { fontSize: 13, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  achNameLocked: { color: '#94A3B8' },
  achLockedLabel: { fontSize: 11, color: '#CBD5E1' },

  // Messages
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  msgFrom: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  msgDate: { fontSize: 11, color: '#94A3B8' },

  msgNote: {
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#FBBF24', marginBottom: 12,
  },
  msgNoteText: { fontSize: 13, color: '#78350F', lineHeight: 20, fontStyle: 'italic' },

  msgApproved: {
    backgroundColor: GREEN_LIGHT, borderRadius: 16, padding: 14,
    borderLeftWidth: 3, borderLeftColor: GREEN, marginBottom: 12,
  },
  msgApprovedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgApprovedIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  msgApprovedIconText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  msgApprovedTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  msgApprovedEx: { fontSize: 12, color: '#047857', marginTop: 1 },
  msgApprovedNote: { fontSize: 13, color: '#065F46', fontStyle: 'italic', lineHeight: 19 },

  msgRejected: {
    backgroundColor: RED_LIGHT, borderRadius: 16, padding: 14,
    borderLeftWidth: 3, borderLeftColor: RED, marginBottom: 12,
  },
  msgRejectedResolved: { opacity: 0.7 },
  msgRejectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msgRejectedIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
  },
  msgRejectedIconText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  msgRejectedTitle: { fontSize: 13, fontWeight: '700', color: '#7F1D1D' },
  msgRejectedEx: { fontSize: 12, color: '#991B1B', marginTop: 1 },
  msgRejectedNote: { fontSize: 13, color: '#991B1B', fontStyle: 'italic', lineHeight: 19, marginBottom: 10 },

  revisedBadge: {
    backgroundColor: GREEN_LIGHT, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  revisedBadgeText: { fontSize: 12, fontWeight: '600', color: GREEN },
  reviseBtn: {
    backgroundColor: RED, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  reviseBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', position: 'relative', paddingBottom: 4 },
  tabEmojiWrap: { position: 'relative' },
  tabEmoji: { fontSize: 22, opacity: 0.4 },
  tabEmojiActive: { opacity: 1 },
  tabBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: RED, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tabLabel: { fontSize: 11, color: '#94A3B8', marginTop: 3, fontWeight: '500' },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute', top: 0, height: 2,
    width: 32, backgroundColor: PURPLE, borderRadius: 1,
  },
})
