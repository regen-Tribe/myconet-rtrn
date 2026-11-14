'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/core/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/core/components/ui/button'
import { Input } from '@/core/components/ui/input'
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
import { Plus, Gift, Pencil, Trash2, Loader2 } from 'lucide-react'

const CATEGORIES = [
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

interface Offer {
  id: string; title: string; description: string | null
  category: string | null; compensation_model: string | null; price: string | null
  is_active: boolean; created_at: string
}

export default function OffersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<Offer[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Offer | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [compensation, setCompensation] = useState('Other')
  const [price, setPrice] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('user_offers').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setOffers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function openNew() {
    setEditing(null); setTitle(''); setDescription(''); setCategory(''); setCompensation('Other'); setPrice('')
    setDialogOpen(true)
  }
  function openEdit(o: Offer) {
    setEditing(o); setTitle(o.title); setDescription(o.description ?? ''); setCategory(o.category ?? '')
    setCompensation(o.compensation_model ?? 'Other'); setPrice(o.price ?? '')
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!userId || !title.trim()) return
    setSaving(true)
    const payload = {
      user_id: userId, title, description: description || null,
      category: category || null, compensation_model: compensation, price: price || null, is_active: true,
    }
    if (editing) {
      const { data } = await supabase.from('user_offers').update(payload).eq('id', editing.id).select().single()
      setOffers(prev => prev.map(o => o.id === editing.id ? data! : o))
    } else {
      const { data } = await supabase.from('user_offers').insert(payload).select().single()
      setOffers(prev => [data!, ...prev])
    }
    setSaving(false); setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    await supabase.from('user_offers').delete().eq('id', id)
    setOffers(prev => prev.filter(o => o.id !== id))
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
          M01 · My Offers
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--ink)', lineHeight: 1.1, margin: '0 0 6px' }}>
              {offers.length === 0 ? 'Share what you offer' : `${offers.length} offer${offers.length !== 1 ? 's' : ''} live`}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
              Services, skills, and resources you offer to the community.
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
                Add offer
              </button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Offer' : 'New Offer'}</DialogTitle>
              <DialogDescription>Share a service, skill, or resource with the community.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Permaculture Design Consultation" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what you offer..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Compensation</Label>
                  <Select value={compensation} onValueChange={setCompensation}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPENSATION.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {(compensation === 'Fixed Price' || compensation === 'Hourly') && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., $50/hour" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Add Offer'}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {offers.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--rule)', borderRadius: 10, padding: '40px 24px', textAlign: 'center' }}>
          <Gift style={{ width: 36, height: 36, color: 'var(--ink-4)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>No offers yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>Share your skills and resources with the community.</div>
          <button onClick={openNew} style={{
            fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--m1)',
            border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Plus style={{ width: 14, height: 14 }} />
            Add your first offer
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {offers.map(o => (
            <div key={o.id} style={{
              position: 'relative', overflow: 'hidden',
              background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--m1)' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginTop: 4, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', minWidth: 0, lineHeight: 1.35 }}>
                  {o.title}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openEdit(o)} aria-label="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, display: 'flex' }}>
                    <Pencil style={{ width: 14, height: 14 }} />
                  </button>
                  <button onClick={() => handleDelete(o.id)} disabled={deletingId === o.id} aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', padding: 4, display: 'flex' }}>
                    {deletingId === o.id ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Trash2 style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>
              {o.description && <div style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 10 }}>{o.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                {o.category && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg-2)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                    {o.category}
                  </span>
                )}
                {o.compensation_model && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--surface)', color: 'var(--ink-3)', border: '1px solid var(--rule)' }}>
                    {o.compensation_model}
                  </span>
                )}
                {o.price && <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginLeft: 'auto' }}>{o.price}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
