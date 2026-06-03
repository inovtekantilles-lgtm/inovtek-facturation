import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Input, Select, Modal, ModalHeader, Spinner, EmptyState } from '../components/ui'

function IcPlus() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IcTrash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg> }

const CATS = ['Logiciel', 'Matériel', 'Formation', 'Bureau', 'Déplacement', 'Fournisseur', 'Autre']
const EMPTY_FORM = { description: '', categorie: 'Logiciel', montant: '', type: 'recurrente', frequence: 'mensuel', jour_renouvellement: 1, date_charge: new Date().toISOString().split('T')[0], notes: '' }
const OBJECTIF = 3500

export default function Charges() {
  const [charges, setCharges] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [caMonth, setCaMonth] = useState(0)

  const load = async () => {
    setLoading(true)
    const debut = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from('charges').select('*').order('created_at', { ascending: false }),
      supabase.from('factures').select('total_ttc, statut').gte('created_at', debut).eq('statut', 'payee')
    ])
    setCharges(c || [])
    setCaMonth((f || []).reduce((s, f) => s + (f.total_ttc || 0), 0))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const recurrentes = charges.filter(c => c.type === 'recurrente' && c.actif)
  const ponctuelles = charges.filter(c => c.type === 'ponctuelle')
  const totalRec = recurrentes.reduce((s, c) => s + (c.montant || 0), 0)
  const totalPonct = ponctuelles.reduce((s, c) => s + (c.montant || 0), 0)
  const totalCharges = totalRec + totalPonct
  const benefice = caMonth - totalCharges
  const pct = Math.min(Math.round((benefice / OBJECTIF) * 100), 100)

  const save = async () => {
    if (!form.description || !form.montant) return
    setSaving(true)
    await supabase.from('charges').insert({ ...form, montant: parseFloat(form.montant), actif: true })
    await load()
    setSaving(false)
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  const deleteCharge = async (id) => {
    if (!confirm('Supprimer cette charge ?')) return
    await supabase.from('charges').delete().eq('id', id)
    await load()
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Charges & Dépenses</h1>
        <Btn onClick={() => setShowModal(true)}><IcPlus />Ajouter une charge</Btn>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Charges du mois</p>
          <p className="font-mono text-2xl font-bold text-white mt-2">{totalCharges.toFixed(0)} €</p>
          <p className="text-xs text-[#f4aaa4] mt-1">Récurrentes + ponctuelles</p>
        </div>
        <div className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">CA brut</p>
          <p className="font-mono text-2xl font-bold text-white mt-2">{caMonth.toFixed(0)} €</p>
        </div>
        <div className="rounded-2xl border border-[#d8b25c]/30 bg-[#d8b25c]/5 p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Bénéfice net</p>
          <p className="font-mono text-2xl font-bold text-[#9ee6bd] mt-2">{benefice.toFixed(0)} €</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1b1b1e]">
            <div className="h-full rounded-full bg-[#3fbf7f]" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">{pct}% → objectif {OBJECTIF} €</p>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#262629] bg-[#141416] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262629]">
              <h2 className="text-sm font-semibold text-white">Abonnements récurrents</h2>
              <p className="font-mono text-sm font-bold text-[#d8b25c]">{totalRec.toFixed(0)} €/mois</p>
            </div>
            {recurrentes.length === 0 ? <EmptyState message="Aucun abonnement" /> : recurrentes.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 border-b border-[#262629] last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{c.description}</p>
                  <p className="text-xs text-neutral-500">{c.categorie} · Renouvellement le {c.jour_renouvellement}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-bold text-white">{c.montant > 0 ? `${c.montant} €` : '—'}</p>
                  <button onClick={() => deleteCharge(c.id)} className="text-neutral-600 hover:text-red-400"><IcTrash /></button>
                </div>
              </div>
            ))}
            <button onClick={() => { setForm({ ...EMPTY_FORM, type: 'recurrente' }); setShowModal(true) }}
              className="flex items-center gap-1.5 px-5 py-3 text-xs text-[#d8b25c] hover:text-[#ecca7e]">
              <IcPlus />Ajouter un abonnement
            </button>
          </div>

          <div className="rounded-2xl border border-[#262629] bg-[#141416] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#262629]">
              <h2 className="text-sm font-semibold text-white">Dépenses ponctuelles</h2>
              <p className="font-mono text-sm font-bold text-white">{totalPonct.toFixed(0)} €</p>
            </div>
            {ponctuelles.length === 0 ? <EmptyState message="Aucune dépense" /> : ponctuelles.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 border-b border-[#262629] last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{c.description}</p>
                  <p className="text-xs text-neutral-500">{c.date_charge ? new Date(c.date_charge).toLocaleDateString('fr-FR') : ''} · {c.categorie}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-bold text-white">{c.montant} €</p>
                  <button onClick={() => deleteCharge(c.id)} className="text-neutral-600 hover:text-red-400"><IcTrash /></button>
                </div>
              </div>
            ))}
            <button onClick={() => { setForm({ ...EMPTY_FORM, type: 'ponctuelle' }); setShowModal(true) }}
              className="flex items-center gap-1.5 px-5 py-3 text-xs text-[#d8b25c] hover:text-[#ecca7e]">
              <IcPlus />Ajouter une dépense
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <ModalHeader title="Ajouter une charge" onClose={() => setShowModal(false)} />
          <div className="p-6 space-y-4">
            <Select label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })}
              options={[{ value: 'recurrente', label: 'Abonnement récurrent' }, { value: 'ponctuelle', label: 'Dépense ponctuelle' }]} />
            <Input label="Description" required value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Ex: Canva Pro, Disque dur..." />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Montant (€)" required type="number" value={form.montant} onChange={v => setForm({ ...form, montant: v })} />
              <Select label="Catégorie" value={form.categorie} onChange={v => setForm({ ...form, categorie: v })}
                options={CATS.map(c => ({ value: c, label: c }))} />
            </div>
            {form.type === 'recurrente' ? (
              <div className="grid grid-cols-2 gap-4">
                <Select label="Fréquence" value={form.frequence} onChange={v => setForm({ ...form, frequence: v })}
                  options={[{ value: 'mensuel', label: 'Mensuel' }, { value: 'annuel', label: 'Annuel' }]} />
                <Input label="Jour de renouvellement" type="number" value={form.jour_renouvellement} onChange={v => setForm({ ...form, jour_renouvellement: Math.min(28, Math.max(1, parseInt(v) || 1)) })} />
              </div>
            ) : (
              <Input label="Date" type="date" value={form.date_charge} onChange={v => setForm({ ...form, date_charge: v })} />
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-[#262629] px-6 py-4">
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Ajouter'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
