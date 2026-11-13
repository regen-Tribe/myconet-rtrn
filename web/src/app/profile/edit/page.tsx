'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/lib/supabase/client'
import { useProfileCompletion } from '@/core/contexts/ProfileCompletion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/ui/card'
import { Badge } from '@/core/components/ui/badge'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
import { Textarea } from '@/core/components/ui/textarea'
import { Label } from '@/core/components/ui/label'
import { Progress } from '@/core/components/ui/progress'
import { Slider } from '@/core/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/select'
import { AvatarCropper } from '@/core/components/AvatarCropper'
import { uploadAvatarBlob } from '@/core/lib/avatar'
import {
  ArrowLeft, ArrowRight, Save, Loader2, User, Heart, Brain,
  Star, Target, Gift, HelpCircle, MapPin, X, Plus, Check, Camera,
} from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Basic Info',        icon: User,       description: 'Your public identity' },
  { id: 2, title: 'Values & Purpose',  icon: Heart,      description: 'What guides you' },
  { id: 3, title: 'Personality',       icon: Brain,      description: 'Your psychological profile' },
  { id: 4, title: 'Archetypes',        icon: Star,       description: 'Spiritual & energetic patterns' },
  { id: 5, title: 'Goals & Growth',    icon: Target,     description: 'Your aspirations' },
  { id: 6, title: 'Offers',            icon: Gift,       description: 'What you provide' },
  { id: 7, title: 'Requests',          icon: HelpCircle, description: 'What you need' },
  { id: 8, title: 'Travel Plans',      icon: MapPin,     description: 'Where you\'re going' },
]

const MBTI_TYPES = [
  { code: 'INTJ', name: 'Architect' }, { code: 'INTP', name: 'Logician' },
  { code: 'ENTJ', name: 'Commander' }, { code: 'ENTP', name: 'Debater' },
  { code: 'INFJ', name: 'Advocate' },  { code: 'INFP', name: 'Mediator' },
  { code: 'ENFJ', name: 'Protagonist' },{ code: 'ENFP', name: 'Campaigner' },
  { code: 'ISTJ', name: 'Logistician' },{ code: 'ISFJ', name: 'Defender' },
  { code: 'ESTJ', name: 'Executive' }, { code: 'ESFJ', name: 'Consul' },
  { code: 'ISTP', name: 'Virtuoso' },  { code: 'ISFP', name: 'Adventurer' },
  { code: 'ESTP', name: 'Entrepreneur' },{ code: 'ESFP', name: 'Entertainer' },
]

const ZODIAC = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]

const HUMAN_DESIGN = ['Manifestor','Generator','Manifesting Generator','Projector','Reflector']

const USER_TYPES = [
  {
    id: 'Exploring',
    label: 'Exploring',
    description: 'Curious about regenerative neighborhoods & community life',
  },
  {
    id: 'Community Member',
    label: 'Community Member',
    description: 'Living in or looking to join a regenerative neighborhood',
    subOptions: [
      { id: 'Community Member - Living In',    label: 'Living in one',   description: "I'm already part of a regenerative community" },
      { id: 'Community Member - Looking For',  label: 'Looking for one', description: "I'm searching for a regenerative community to join" },
    ],
  },
  {
    id: 'Vision Holder',
    label: 'Vision Holder',
    description: 'I hold a vision or am actively building a regenerative project',
  },
  {
    id: 'Service Provider',
    label: 'Service Provider',
    description: 'I offer skills, services, or expertise to communities',
  },
  {
    id: 'Resource Holder - Land',
    label: 'Resource Holder – Land',
    description: 'I have land that could support a regenerative project',
  },
  {
    id: 'Resource Holder - Money',
    label: 'Resource Holder – Money',
    description: 'I have financial resources to invest in regenerative projects',
  },
]

const OFFER_CATEGORIES = [
  'Permaculture','Construction','Healing','Education',
  'Technology','Art','Music','Food','Childcare',
  'Legal','Finance','Consulting','Other',
]

const COMPENSATION = [
  { value: 'Free',        label: 'Free' },
  { value: 'Donation',    label: 'Donation-based' },
  { value: 'Fixed Price', label: 'Fixed Price' },
  { value: 'Hourly',      label: 'Hourly Rate' },
  { value: 'Barter',      label: 'Barter / Trade' },
  { value: 'Other',       label: 'Other' },
]

const REQUEST_CATEGORIES = [
  'Housing','Transport','Skills','Resources',
  'Community','Mentorship','Funding','Land','Tools','Knowledge','Other',
]

type Offer = { id?: string; title: string; description: string; category: string; compensation_model: string; price: string }
type Request = { id?: string; request_text: string; category: string; urgency: string }
type TravelPlan = { location: string; startDate: string; endDate: string; notes: string }

interface FormData {
  // Step 1 – Basic
  first_name: string; last_name: string; headline: string
  // Public card (visitors see these)
  public_bio: string; website_url: string; instagram: string; linkedin: string; twitter: string
  country: string; city: string; user_types: string[]
  skills: string[]; interests: string[]
  // Step 2 – Values
  values_principles: string; what_creating: string
  // Step 3 – Personality
  myersBriggs: string
  ocean: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }
  // Step 4 – Archetypes
  astrologySun: string; astrologyMoon: string; astrologyRising: string
  humanDesign: string; geneKey: string; mayan: string
  // Step 5 – Goals
  goals: string; fears: string; traumas: string
  /** Who sees fears and traumas (user_growth.visibility) */
  growthVisibility: GrowthVisibility
  // Step 6 – Offers
  offers: Offer[]
  // Step 7 – Requests
  requests: Request[]
  // Step 8 – Travel
  placesTraveling: TravelPlan[]
}

type GrowthVisibility = 'anyone' | 'explorers' | 'joining' | 'full_members' | 'only_me'
const GROWTH_VISIBILITY: { id: GrowthVisibility; label: string; description: string }[] = [
  { id: 'only_me',      label: 'Only me',                 description: 'Nobody else sees it. Useful as notes for yourself.' },
  { id: 'full_members', label: 'Full members',            description: 'Members, circle and project leads, advisors and admins.' },
  { id: 'joining',      label: 'Joining members and up',  description: 'Also people who are on their way to becoming members.' },
  { id: 'explorers',    label: 'Everyone signed up',      description: 'Anyone with an account, including explorers.' },
  { id: 'anyone',       label: 'Anyone',                  description: 'Public, including visitors who aren’t signed in.' },
]

/** "yoursite.com" → "https://yoursite.com"; the database only accepts http(s) links */
function websiteUrl(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

const DEFAULT: FormData = {
  first_name: '', last_name: '', headline: '', country: '', city: '',
  public_bio: '', website_url: '', instagram: '', linkedin: '', twitter: '',
  user_types: [], skills: [], interests: [],
  values_principles: '', what_creating: '',
  myersBriggs: '',
  ocean: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
  astrologySun: '', astrologyMoon: '', astrologyRising: '',
  humanDesign: '', geneKey: '', mayan: '',
  goals: '', fears: '', traumas: '', growthVisibility: 'full_members',
  offers: [], requests: [], placesTraveling: [],
}

function TagInput({ value, onChange, placeholder, suggestions = [] }: {
  value: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[]
}) {
  const [input, setInput] = useState('')
  const add = (tag: string) => {
    const t = tag.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
  }
  const remove = (tag: string) => onChange(value.filter(t => t !== tag))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-background">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button type="button" onClick={() => remove(tag)}><X className="h-3 w-3" /></button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
            if (e.key === 'Backspace' && !input && value.length) remove(value[value.length - 1])
          }}
          placeholder={value.length === 0 ? placeholder : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        />
      </div>
      {suggestions.filter(s => !value.includes(s)).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.filter(s => !value.includes(s)).slice(0, 6).map(s => (
            <button key={s} type="button" onClick={() => add(s)}
              className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OceanSlider({ label, value, onChange, description, low, high }: {
  label: string; value: number; onChange: (v: number) => void; description: string
  low: string; high: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="font-medium">{label}</Label>
        <span className="text-sm text-muted-foreground">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={([v]: number[]) => onChange(v)} max={100} step={5} />
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">{low}</span>
        <span className="text-xs text-muted-foreground">{high}</span>
      </div>
    </div>
  )
}

function computeWizardPct(form: FormData, avatarUrl: string | null): number {
  const checks = [
    !!avatarUrl,
    !!form.first_name.trim(),
    !!form.headline.trim(),
    !!form.city.trim(),
    form.user_types.length > 0,
    !!form.values_principles.trim(),
    form.skills.length > 0,
    !!form.goals.trim(),
    form.offers.some(o => o.title.trim()),
    form.requests.some(r => r.request_text.trim()),
    form.placesTraveling.some(t => t.location.trim()),
  ]
  return Math.round(checks.filter(Boolean).length / checks.length * 100)
}

export default function ProfileWizard() {
  const supabase = createClient()
  const router = useRouter()
  const { setPct } = useProfileCompletion()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(DEFAULT)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [achievementEarned, setAchievementEarned] = useState(false)

  useEffect(() => {
    if (loading || !userId) return
    const pct = computeWizardPct(form, avatarUrl)
    setPct(pct)
    if (pct === 100) {
      supabase.from('user_achievements')
        .upsert({ user_id: userId, achievement_key: 'profile_complete' }, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true })
        .then(() => setAchievementEarned(true))
    }
  }, [form, avatarUrl, loading, userId])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const [profileRes, bioRes, offersRes, requestsRes, growthRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_bio').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_offers').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('user_requests').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('user_growth').select('fears, traumas, visibility').eq('user_id', user.id).maybeSingle(),
      ])

      const p = profileRes.data
      if (p?.avatar_url) setAvatarUrl(p.avatar_url)
      const b = bioRes.data
      const pd = b?.personality_details as any
      const arc = b?.archetypes as any
      const travels = (b?.places_traveling ?? []) as any[]

      setForm({
        first_name: p?.first_name ?? '',
        last_name:  p?.last_name ?? '',
        headline:   p?.headline ?? '',
        public_bio:  p?.public_bio ?? '',
        website_url: p?.website_url ?? '',
        instagram:   p?.instagram ?? '',
        linkedin:    p?.linkedin ?? '',
        twitter:     p?.twitter ?? '',
        country:    p?.country ?? '',
        city:       p?.city ?? '',
        user_types: p?.user_types ?? [],
        skills:     b?.skills ?? [],
        interests:  b?.interests ?? [],
        values_principles: b?.values_principles ?? '',
        what_creating:     b?.what_creating ?? '',
        myersBriggs:       pd?.myersBriggs ?? '',
        ocean: {
          openness:         pd?.ocean?.openness         ?? 50,
          conscientiousness:pd?.ocean?.conscientiousness ?? 50,
          extraversion:     pd?.ocean?.extraversion      ?? 50,
          agreeableness:    pd?.ocean?.agreeableness     ?? 50,
          neuroticism:      pd?.ocean?.neuroticism        ?? 50,
        },
        astrologySun:   arc?.astrology?.sun    ?? '',
        astrologyMoon:  arc?.astrology?.moon   ?? '',
        astrologyRising:arc?.astrology?.rising ?? '',
        humanDesign:    arc?.humanDesign ?? '',
        geneKey:        arc?.geneKey    ?? '',
        mayan:          arc?.mayan      ?? '',
        goals:   b?.goals  ?? '',
        fears:   growthRes.data?.fears ?? '',
        traumas: growthRes.data?.traumas ?? '',
        growthVisibility: (growthRes.data?.visibility as GrowthVisibility | undefined) ?? 'full_members',
        offers: (offersRes.data ?? []).map((o: any) => ({
          id: o.id, title: o.title, description: o.description ?? '',
          category: o.category ?? '', compensation_model: o.compensation_model ?? 'Other', price: o.price ?? '',
        })),
        requests: (requestsRes.data ?? []).map((r: any) => ({
          id: r.id, request_text: r.request_text, category: r.category ?? '', urgency: r.urgency ?? 'normal',
        })),
        placesTraveling: travels.map((t: any) => ({
          location: t.location ?? '', startDate: t.startDate ?? '', endDate: t.endDate ?? '', notes: t.notes ?? '',
        })),
      })
      setLoading(false)
    }
    load()
  }, [])

  const update = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const toggleUserType = (id: string) => {
    if (form.user_types.includes(id)) {
      const parent = USER_TYPES.find(t => t.id === id)
      const subIds = parent?.subOptions?.map(s => s.id) ?? []
      update('user_types', form.user_types.filter(x => x !== id && !subIds.includes(x)))
    } else {
      update('user_types', [...form.user_types, id])
    }
  }

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPendingPhoto(file)
    e.target.value = ''
  }

  async function handleAvatarCropped(blob: Blob) {
    if (!userId) return
    setAvatarUploading(true)
    try {
      const url = await uploadAvatarBlob(supabase, userId, blob)
      setAvatarUrl(url)
      setPendingPhoto(null)
    } catch (err: any) {
      alert('Photo upload failed: ' + (err?.message ?? String(err)))
    } finally {
      setAvatarUploading(false)
    }
  }

  async function save() {
    if (!userId) return
    setSaving(true)
    try {
      // Update profile
      await supabase.from('user_profiles').update({
        first_name: form.first_name || null,
        last_name:  form.last_name  || null,
        headline:   form.headline   || null,
        public_bio:  form.public_bio.trim() || null,
        website_url: websiteUrl(form.website_url),
        instagram:   form.instagram.trim() || null,
        linkedin:    form.linkedin.trim() || null,
        twitter:     form.twitter.trim() || null,
        country:    form.country    || null,
        city:       form.city       || null,
        user_types: form.user_types,
      }).eq('id', userId)

      // Upsert bio
      await supabase.from('user_bio').upsert({
        user_id: userId,
        values_principles: form.values_principles || null,
        what_creating:     form.what_creating     || null,
        personality_details: {
          myersBriggs: form.myersBriggs || null,
          ocean: form.ocean,
        },
        archetypes: {
          astrology: {
            sun:    form.astrologySun    || null,
            moon:   form.astrologyMoon   || null,
            rising: form.astrologyRising || null,
          },
          humanDesign: form.humanDesign || null,
          geneKey:     form.geneKey     || null,
          mayan:       form.mayan       || null,
        },
        goals:   form.goals   || null,
        skills:   form.skills,
        interests: form.interests,
        places_traveling: form.placesTraveling.filter(t => t.location.trim()),
      }, { onConflict: 'user_id' })

      // Fears and traumas live apart, shared only with the people chosen
      await supabase.from('user_growth').upsert({
        user_id: userId,
        fears:   form.fears.trim()   || null,
        traumas: form.traumas.trim() || null,
        visibility: form.growthVisibility,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Sync offers: delete all then re-insert
      await supabase.from('user_offers').delete().eq('user_id', userId)
      if (form.offers.length) {
        await supabase.from('user_offers').insert(
          form.offers.filter(o => o.title.trim()).map(o => ({
            user_id: userId,
            title: o.title,
            description: o.description || null,
            category: o.category || null,
            compensation_model: o.compensation_model,
            price: o.price || null,
            is_active: true,
          }))
        )
      }

      // Sync requests: delete all then re-insert
      await supabase.from('user_requests').delete().eq('user_id', userId)
      if (form.requests.length) {
        await supabase.from('user_requests').insert(
          form.requests.filter(r => r.request_text.trim()).map(r => ({
            user_id: userId,
            request_text: r.request_text,
            category: r.category || null,
            urgency: r.urgency,
            is_active: true,
          }))
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    await save()
    if (step < STEPS.length) setStep(s => s + 1)
    else router.push('/network/profile')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  const stepData = STEPS[step - 1]
  const StepIcon = stepData.icon
  const progress = (step / STEPS.length) * 100

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">

      {pendingPhoto && (
        <AvatarCropper
          file={pendingPhoto}
          busy={avatarUploading}
          onCancel={() => setPendingPhoto(null)}
          onCropped={handleAvatarCropped}
        />
      )}

      {/* Achievement banner */}
      {achievementEarned && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 12,
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--m1) 18%, transparent), color-mix(in srgb, var(--accent-color) 12%, transparent))',
          border: '1px solid color-mix(in srgb, var(--m1) 35%, var(--rule))',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--m1), var(--accent-color))',
            display: 'grid', placeItems: 'center',
            fontSize: 22, boxShadow: '0 2px 8px color-mix(in srgb, var(--m1) 35%, transparent)',
          }}>✦</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
              Achievement unlocked — Profile Pioneer
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              You completed your full member profile. Badge added to your Contributions record.
            </div>
          </div>
          <a href="/contributions" style={{
            fontSize: 12, fontWeight: 600, color: 'var(--m1)',
            textDecoration: 'none', whiteSpace: 'nowrap',
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid color-mix(in srgb, var(--m1) 30%, var(--rule))',
          }}>View badge →</a>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-muted-foreground">Step {step} of {STEPS.length}: {stepData.title}</p>
          </div>
          <Button variant="outline" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" />Save Draft</>}
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 overflow-x-auto pb-1 gap-1">
          {STEPS.map(s => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => setStep(s.id)}
                className={`flex flex-col items-center gap-1 min-w-[56px] p-2 rounded-lg transition-colors ${
                  s.id === step ? 'bg-primary/10 text-primary' : s.id < step ? 'text-primary' : 'text-muted-foreground'
                }`}>
                {s.id < step ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                <span className="text-[10px] font-medium hidden sm:block text-center leading-tight">{s.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepIcon className="h-5 w-5 text-primary" />
            {stepData.title}
          </CardTitle>
          <CardDescription>{stepData.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <>
              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2 pb-2">
                <label htmlFor="avatar-upload" className="cursor-pointer group relative">
                  <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-soft)', border: '2px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--accent)', position: 'relative' }}>
                    {avatarUrl
                      ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span>{(form.first_name?.[0] ?? '?').toUpperCase()}</span>
                    }
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 150ms' }}
                      className="group-hover:opacity-100">
                      {avatarUploading
                        ? <Loader2 style={{ width: 22, height: 22, color: '#fff' }} className="animate-spin" />
                        : <Camera style={{ width: 22, height: 22, color: '#fff' }} />
                      }
                    </div>
                  </div>
                </label>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
                <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>Click photo to change</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="e.g., Alex" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="e.g., Rivera" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input value={form.headline} onChange={e => update('headline', e.target.value)}
                  placeholder="e.g., Permaculture Designer & Community Builder" />
                <p className="text-xs text-muted-foreground">A short description that appears under your name</p>
              </div>
              <div className="space-y-2">
                <Label>About you</Label>
                <Textarea value={form.public_bio} onChange={e => update('public_bio', e.target.value)} rows={3} maxLength={1000}
                  placeholder="A few sentences about you, your work and what brings you here" />
                <p className="text-xs text-muted-foreground">Public: anyone can see your name, headline, this and your links. The rest of your profile is only for people who have signed up.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website_url} onChange={e => update('website_url', e.target.value)} placeholder="yoursite.com" inputMode="url" />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input value={form.instagram} onChange={e => update('instagram', e.target.value)} placeholder="@yourname" />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={form.linkedin} onChange={e => update('linkedin', e.target.value)} placeholder="yourname or profile link" />
                </div>
                <div className="space-y-2">
                  <Label>X / Twitter</Label>
                  <Input value={form.twitter} onChange={e => update('twitter', e.target.value)} placeholder="@yourname" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={e => update('country', e.target.value)} placeholder="e.g., Costa Rica" />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="e.g., San José" />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Who are you in this network?</Label>
                <p className="text-xs text-muted-foreground">Select all that apply</p>
                <div className="flex flex-col gap-2">
                  {USER_TYPES.map(t => {
                    const isSelected = form.user_types.includes(t.id)
                    return (
                      <div key={t.id}>
                        <button type="button" onClick={() => toggleUserType(t.id)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                            isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                          }`}>
                          <div className={`mt-0.5 h-4 w-4 rounded flex-shrink-0 border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>{t.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                          </div>
                        </button>

                        {'subOptions' in t && isSelected && (
                          <div className="ml-7 mt-2 grid grid-cols-2 gap-2">
                            {t.subOptions!.map(sub => {
                              const subSelected = form.user_types.includes(sub.id)
                              return (
                                <button key={sub.id} type="button" onClick={() => toggleUserType(sub.id)}
                                  className={`flex flex-col gap-1 p-3 rounded-lg border text-left transition-colors ${
                                    subSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                                  }`}>
                                  <span className="text-sm font-medium">{sub.label}</span>
                                  <span className="text-xs text-muted-foreground">{sub.description}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Skills</Label>
                <TagInput value={form.skills} onChange={v => update('skills', v)}
                  placeholder="Add your skills..."
                  suggestions={['Permaculture','Construction','Teaching','Healing','Technology','Art']} />
              </div>
              <div className="space-y-2">
                <Label>Interests</Label>
                <TagInput value={form.interests} onChange={v => update('interests', v)}
                  placeholder="Add your interests..."
                  suggestions={['Sustainability','Community','Spirituality','Nature','Music','Travel']} />
              </div>
            </>
          )}

          {/* ── Step 2: Values & Purpose ── */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Core Values & Principles</Label>
                <Textarea value={form.values_principles} onChange={e => update('values_principles', e.target.value)}
                  placeholder="What principles guide your life and work? What do you stand for?"
                  className="min-h-[150px]" />
                <p className="text-xs text-muted-foreground">Share what matters most to you and what you believe in</p>
              </div>
              <div className="space-y-2">
                <Label>What are you creating?</Label>
                <Textarea value={form.what_creating} onChange={e => update('what_creating', e.target.value)}
                  placeholder="What projects, visions, or initiatives are you working on?"
                  className="min-h-[100px]" />
              </div>
            </>
          )}

          {/* ── Step 3: Personality ── */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Myers-Briggs Type</Label>
                  <a href="https://www.16personalities.com/free-personality-test" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
                    click here to find yours
                  </a>
                </div>
                <Select value={form.myersBriggs} onValueChange={v => update('myersBriggs', v)}>
                  <SelectTrigger><SelectValue placeholder="Select your type" /></SelectTrigger>
                  <SelectContent>
                    {MBTI_TYPES.map(t => (
                      <SelectItem key={t.code} value={t.code}>{t.code} – {t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label className="text-base font-semibold">OCEAN / Big Five Personality</Label>
                <OceanSlider label="Openness" value={form.ocean.openness}
                  onChange={v => update('ocean', { ...form.ocean, openness: v })}
                  description="Curiosity, creativity, and openness to new experiences"
                  low="Conventional" high="Curious & creative" />
                <OceanSlider label="Conscientiousness" value={form.ocean.conscientiousness}
                  onChange={v => update('ocean', { ...form.ocean, conscientiousness: v })}
                  description="Organization, dependability, and self-discipline"
                  low="Spontaneous" high="Organised & disciplined" />
                <OceanSlider label="Extraversion" value={form.ocean.extraversion}
                  onChange={v => update('ocean', { ...form.ocean, extraversion: v })}
                  description="Sociability, energy, and talkativeness"
                  low="Introvert" high="Extravert" />
                <OceanSlider label="Agreeableness" value={form.ocean.agreeableness}
                  onChange={v => update('ocean', { ...form.ocean, agreeableness: v })}
                  description="Cooperation, trust, and helpfulness"
                  low="Direct & independent" high="Harmony-seeking" />
                <OceanSlider label="Neuroticism" value={form.ocean.neuroticism}
                  onChange={v => update('ocean', { ...form.ocean, neuroticism: v })}
                  description="Emotional sensitivity and tendency to experience negative emotions"
                  low="Calm & stable" high="Emotionally intense" />
              </div>
            </>
          )}

          {/* ── Step 4: Archetypes ── */}
          {step === 4 && (
            <>
              <p className="text-muted-foreground text-sm">Share your archetypal patterns if you know them — all fields are optional.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: 'Sun Sign',    val: form.astrologySun,    key: 'astrologySun' },
                  { label: 'Moon Sign',   val: form.astrologyMoon,   key: 'astrologyMoon' },
                  { label: 'Rising Sign', val: form.astrologyRising, key: 'astrologyRising' },
                ].map(({ label, val, key }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Select value={val} onValueChange={v => update(key as keyof FormData, v as any)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{ZODIAC.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Human Design Type</Label>
                <Select value={form.humanDesign} onValueChange={v => update('humanDesign', v)}>
                  <SelectTrigger><SelectValue placeholder="Select your type" /></SelectTrigger>
                  <SelectContent>{HUMAN_DESIGN.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gene Key / I-Ching</Label>
                <Input value={form.geneKey} onChange={e => update('geneKey', e.target.value)} placeholder="e.g., Gene Key 22" />
              </div>
              <div className="space-y-2">
                <Label>Mayan Sign</Label>
                <Input value={form.mayan} onChange={e => update('mayan', e.target.value)} placeholder="e.g., White Rhythmic Wizard" />
              </div>
            </>
          )}

          {/* ── Step 5: Goals & Growth ── */}
          {step === 5 && (
            <>
              <div className="space-y-2">
                <Label>Goals & Aspirations</Label>
                <Textarea value={form.goals} onChange={e => update('goals', e.target.value)}
                  placeholder="What are you working towards? What do you want to achieve or create in the next few years?"
                  className="min-h-[120px]" />
              </div>
              <div className="space-y-2">
                <Label>Fears & Challenges</Label>
                <Textarea value={form.fears} onChange={e => update('fears', e.target.value)}
                  placeholder="What are you working to overcome? What challenges do you face?"
                  className="min-h-[100px]" />
                <p className="text-xs text-muted-foreground">Optional – sharing vulnerabilities helps create deeper connections</p>
              </div>
              <div className="space-y-2">
                <Label>Healing Journey</Label>
                <Textarea value={form.traumas} onChange={e => update('traumas', e.target.value)}
                  placeholder="What healing work are you doing? What have you overcome?"
                  className="min-h-[100px]" />
                <p className="text-xs text-muted-foreground">Optional – share only what feels comfortable</p>
              </div>
              <div className="space-y-2">
                <Label>Who can see your fears and healing journey?</Label>
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Who can see your fears and healing journey">
                  {GROWTH_VISIBILITY.map(o => {
                    const on = form.growthVisibility === o.id
                    return (
                      <label key={o.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${on ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                        <input type="radio" name="growth-visibility" checked={on} onChange={() => update('growthVisibility', o.id)} className="mt-1" />
                        <span>
                          <span className={`block text-sm font-medium ${on ? 'text-primary' : ''}`}>{o.label}</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">{o.description}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Step 6: Offers ── */}
          {step === 6 && (
            <>
              <p className="text-muted-foreground text-sm">What services, skills, or resources can you offer to the community?</p>
              <div className="space-y-4">
                {form.offers.map((offer, i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">Offer {i + 1}</p>
                        <Button variant="ghost" size="icon"
                          onClick={() => update('offers', form.offers.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input value={offer.title} onChange={e => {
                          const o = [...form.offers]; o[i] = { ...o[i], title: e.target.value }; update('offers', o)
                        }} placeholder="e.g., Permaculture Design Consultation" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea value={offer.description} onChange={e => {
                          const o = [...form.offers]; o[i] = { ...o[i], description: e.target.value }; update('offers', o)
                        }} placeholder="Describe what you offer..." />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={offer.category} onValueChange={v => {
                            const o = [...form.offers]; o[i] = { ...o[i], category: v }; update('offers', o)
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{OFFER_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Compensation</Label>
                          <Select value={offer.compensation_model} onValueChange={v => {
                            const o = [...form.offers]; o[i] = { ...o[i], compensation_model: v }; update('offers', o)
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                            <SelectContent>{COMPENSATION.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      {(offer.compensation_model === 'Fixed Price' || offer.compensation_model === 'Hourly') && (
                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input value={offer.price} onChange={e => {
                            const o = [...form.offers]; o[i] = { ...o[i], price: e.target.value }; update('offers', o)
                          }} placeholder="e.g., $50/hour" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full"
                onClick={() => update('offers', [...form.offers, { title: '', description: '', category: '', compensation_model: 'Other', price: '' }])}>
                <Plus className="mr-2 h-4 w-4" />Add Offer
              </Button>
            </>
          )}

          {/* ── Step 7: Requests ── */}
          {step === 7 && (
            <>
              <p className="text-muted-foreground text-sm">What help, resources, or connections are you looking for?</p>
              <div className="space-y-4">
                {form.requests.map((req, i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">Request {i + 1}</p>
                        <Button variant="ghost" size="icon"
                          onClick={() => update('requests', form.requests.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>What do you need?</Label>
                        <Textarea value={req.request_text} onChange={e => {
                          const r = [...form.requests]; r[i] = { ...r[i], request_text: e.target.value }; update('requests', r)
                        }} placeholder="Describe what you're looking for..." />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={req.category} onValueChange={v => {
                            const r = [...form.requests]; r[i] = { ...r[i], category: v }; update('requests', r)
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{REQUEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Urgency</Label>
                          <Select value={req.urgency} onValueChange={v => {
                            const r = [...form.requests]; r[i] = { ...r[i], urgency: v }; update('requests', r)
                          }}>
                            <SelectTrigger><SelectValue placeholder="Select urgency" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low – Whenever</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High – Soon</SelectItem>
                              <SelectItem value="urgent">Urgent – ASAP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full"
                onClick={() => update('requests', [...form.requests, { request_text: '', category: '', urgency: 'normal' }])}>
                <Plus className="mr-2 h-4 w-4" />Add Request
              </Button>
            </>
          )}

          {/* ── Step 8: Travel Plans ── */}
          {step === 8 && (
            <>
              <p className="text-muted-foreground text-sm">Where are you planning to travel? This helps connect you with communities along your path.</p>
              <div className="space-y-4">
                {form.placesTraveling.map((plan, i) => (
                  <Card key={i} className="border-card-border">
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">Travel Plan {i + 1}</p>
                        <Button variant="ghost" size="icon"
                          onClick={() => update('placesTraveling', form.placesTraveling.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label>Destination</Label>
                        <Input value={plan.location} onChange={e => {
                          const t = [...form.placesTraveling]; t[i] = { ...t[i], location: e.target.value }; update('placesTraveling', t)
                        }} placeholder="e.g., Costa Rica" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input type="date" value={plan.startDate} onChange={e => {
                            const t = [...form.placesTraveling]; t[i] = { ...t[i], startDate: e.target.value }; update('placesTraveling', t)
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input type="date" value={plan.endDate} onChange={e => {
                            const t = [...form.placesTraveling]; t[i] = { ...t[i], endDate: e.target.value }; update('placesTraveling', t)
                          }} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea value={plan.notes} onChange={e => {
                          const t = [...form.placesTraveling]; t[i] = { ...t[i], notes: e.target.value }; update('placesTraveling', t)
                        }} placeholder="What are you looking to do there?" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="outline" className="w-full"
                onClick={() => update('placesTraveling', [...form.placesTraveling, { location: '', startDate: '', endDate: '', notes: '' }])}>
                <Plus className="mr-2 h-4 w-4" />Add Travel Plan
              </Button>
            </>
          )}

        </CardContent>
      </Card>

      <div className="flex justify-between mt-6 gap-4">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />Previous
        </Button>
        <Button onClick={handleNext} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {step === STEPS.length
            ? <><Check className="mr-2 h-4 w-4" />Save & Finish</>
            : <>Next<ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  )
}
