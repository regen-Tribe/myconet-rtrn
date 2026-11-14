'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/core/components/ui/button'
import { Textarea } from '@/core/components/ui/textarea'
import { Label } from '@/core/components/ui/label'
import { Skeleton } from '@/core/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/core/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/core/components/ui/select'
import { Plus, HelpCircle, Pencil, Trash2, Loader2 } from 'lucide-react'

const CATEGORIES = [
  'Housing','Transport','Skills','Resources','Community',
  'Mentorship','Funding','Land','Tools','Knowledge','Other',
]

const URGENCY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

interface Request {
  id: string; request_text: string; category: string | null
  urgency: string | null; is_active: boolean; created_at: string
}

export default function SeeksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<Request[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Request | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [requestText, setRequestText] = useState('')
  const [category, setCategory] = useState('Other')
  const [urgency, setUrgency] = useState('normal')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('user_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setRequests(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function openNew() {
    setEditing(null); setRequestText(''); setCategory('Other'); setUrgency('normal')
    setDialogOpen(true)
  }
  function openEdit(r: Request) {
    setEditing(r); setRequestText(r.request_text); setCategory(r.category ?? 'Other'); setUrgency(r.urgency ?? 'normal')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!userId || !requestText.trim()) return
    setSaving(true)
    const payload = { user_id: userId, request_text: requestText.trim(), category, urgency, is_active: true }
    if (editing) {
      const { data } = await supabase.from('user_requests').update(payload).eq('id', editing.id).select().single()
      setRequests(prev => prev.map(r => r.id === editing.id ? data! : r))
    } else {
      const { data } = await supabase.from('user_requests').insert(payload).select().single()
      setRequests(prev => [data!, ...prev])
    }
    setSaving(false); setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('user_requests').delete().eq('id', id)
    setRequests(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }

  if (loading) return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
    </div>
  )

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 28px 80px' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 8 }}>
          M01 · My Seeks
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
              {requests.length === 0 ? "Tell the community what you need" : `${requests.length} active seek${requests.length !== 1 ? 's' : ''}`}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
              Help, resources, and connections you're looking for.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button onClick={openNew} style={{
                fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)',
                border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Plus style={{ width: 14, height: 14 }} />
                Add seek
              </button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Seek' : 'New Seek'}</DialogTitle>
              <DialogDescription>Tell the community what you need or are looking for.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>What do you need? *</Label>
                <Textarea value={requestText} onChange={e => setRequestText(e.target.value)}
                  placeholder="e.g., Looking for land to co-steward in the Pacific Northwest..." className="min-h-[100px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{URGENCY_OPTIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !requestText.trim()} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Post Seek'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {requests.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '40px 24px', textAlign: 'center' }}>
          <HelpCircle style={{ width: 36, height: 36, color: 'var(--ink-4)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>No seeks yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>Let the community know what you need.</div>
          <button onClick={openNew} style={{
            fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)',
            border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Plus style={{ width: 14, height: 14 }} />
            Post your first seek
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {requests.map(r => {
            const urgencyColor =
              r.urgency === 'urgent' ? 'var(--m9)' :
              r.urgency === 'high'   ? 'var(--m4)' :
              r.urgency === 'low'    ? 'var(--ink-4)' :
              'var(--m1)'
            return (
              <div key={r.id} style={{
                position: 'relative', overflow: 'hidden',
                background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: urgencyColor }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginTop: 4, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {r.category && (
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                        {r.category}
                      </span>
                    )}
                    {r.urgency && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                        color: urgencyColor,
                        background: `color-mix(in srgb, ${urgencyColor} 10%, var(--surface))`,
                        border: `1px solid color-mix(in srgb, ${urgencyColor} 25%, var(--rule))`,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {r.urgency}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEdit(r)} aria-label="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, display: 'flex' }}>
                      <Pencil style={{ width: 14, height: 14 }} />
                    </button>
                    <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, display: 'flex' }}>
                      {deletingId === r.id ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Trash2 style={{ width: 14, height: 14 }} />}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{r.request_text}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
