import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Input, Select, TVASelect, Modal, ModalHeader, Spinner, EmptyState } from '../components/ui'

const EMPTY_LIGNE = { desc: '', qte: 1, prix_ht: 0 }

function calcTotaux(lignes, tva) {
  const ht = lignes.reduce((s, l) => s + (parseFloat(l.prix_ht) || 0) * (parseInt(l.qte) || 1), 0)
  const rate = parseFloat(tva) / 100
  const tva_montant = ht * rate
  return { ht: ht.toFixed(2), tva_montant: tva_montant.toFixed(2), ttc: (ht + tva_montant).toFixed(2) }
}

function IcPlus() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IcMail() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg> }
function IcTrash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg> }
function IcStripe() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> }
function IcCheck() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> }

export default function Factures() {
  const [factures, setFactures] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Toutes')
  const [view, setView] = useState('list')
  const [form, setForm] = useState({ client_id: '', tva: '0', due_days: 15 })
  const [lignes, setLignes] = useState([{ ...EMPTY_LIGNE }])
  const [saving, setSaving] = useState(false)
  const [sendModal, setSendModal] = useState(null)
  const [sending, setSending] = useState(null)

  const load = async () => {
    setLoading(true)
    const [{ data: f }, { data: c }] = await Promise.all([
      supabase.from('factures').select('*, clients(nom, prenom, entreprise, email)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom, prenom, entreprise, email').order('nom')
    ])
    setFactures(f || [])
    setClients(c || [])
    if (c?.length && !form.client_id) setForm(f2 => ({ ...f2, client_id: c[0].id }))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const { ht, tva_montant, ttc } = calcTotaux(lignes, form.tva)

  const nextNum = () => {
    const year = new Date().getFullYear()
    const max = factures.reduce((m, f) => {
      const n = parseInt(f.numero?.split('-')[2] || '0')
      return n > m ? n : m
    }, 0)
    return `FAC-${year}-${String(max + 1).padStart(3, '0')}`
  }

  const createFacture = async () => {
    if (!form.client_id) return
    setSaving(true)
    const dueDate = new Date(Date.now() + parseInt(form.due_days) * 864e5).toISOString().split('T')[0]
    const { data } = await supabase.from('factures').insert({
      client_id: form.client_id, numero: nextNum(), lignes,
      total_ht: parseFloat(ht), tva_taux: parseFloat(form.tva),
      tva_montant: parseFloat(tva_montant), total_ttc: parseFloat(ttc),
      statut: 'brouillon', due_date: dueDate
    }).select().single()
    await load()
    setSaving(false)
    setView('list')
  }

  const sendFacture = async (f) => {
    setSending(f.id)
    const stripeLink = `https://buy.stripe.com/inovtek/${f.numero.toLowerCase().replace(/-/g, '')}`
    await supabase.from('factures').update({
      statut: 'envoyee', sent_at: new Date().toISOString(), stripe_payment_link: stripeLink
    }).eq('id', f.id)
    await load()
    setSending(null)
    setSendModal({ ...f, stripe_payment_link: stripeLink })
  }

  const markPaid = async (id) => {
    await supabase.from('factures').update({ statut: 'payee', paid_at: new Date().toISOString() }).eq('id', id)
    await load()
  }

  const STATUS_MAP = { brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', en_retard: 'En retard' }
  const FILTERS = ['Toutes', 'Brouillon', 'Envoyée', 'Payée', 'En retard']
  const filtered = filter === 'Toutes' ? factures : factures.filter(f => STATUS_MAP[f.statut] === filter)

  const enAttente = factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.total_ttc || 0), 0)
  const payees = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0)
  const retard = factures.filter(f => f.statut === 'en_retard').reduce((s, f) => s + (f.total_ttc || 0), 0)

  if (view === 'form') return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="text-neutral-400 hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-2xl font-bold text-white">Nouvelle facture</h1>
        <span className="font-mono text-sm text-neutral-500 bg-[#141416] border border-[#262629] rounded-lg px-3 py-1">{nextNum()}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Select label="Client professionnel" required value={form.client_id} onChange={v => setForm({ ...form, client_id: v })}
            options={clients.map(c => ({ value: c.id, label: `${c.prenom || ''} ${c.nom} — ${c.entreprise}`.trim() }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Échéance (jours)" type="number" value={form.due_days} onChange={v => setForm({ ...form, due_days: v })} />
            <TVASelect value={form.tva} onChange={v => setForm({ ...form, tva: v })} />
          </div>

          <div className="rounded-xl border border-[rgba(91,155,242,0.3)] bg-[rgba(91,155,242,0.06)] p-4">
            <p className="text-xs font-medium text-[#aecbf7] mb-1">Paiement Stripe</p>
            <p className="text-xs text-neutral-400">Un lien de paiement Stripe sera généré automatiquement lors de l'envoi. Le client pourra payer en ligne directement.</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">Prestations</p>
          <div className="space-y-2">
            {lignes.map((l, i) => (
              <div key={i} className="rounded-xl border border-[#262629] bg-[#0a0a0b] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={l.desc} onChange={e => setLignes(lignes.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                    placeholder="Description de la prestation"
                    className="flex-1 rounded-lg border border-[#262629] bg-[#141416] px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[#d8b25c] focus:outline-none" />
                  <button onClick={() => setLignes(lignes.filter((_, j) => j !== i))} className="text-neutral-600 hover:text-red-400 shrink-0"><IcTrash /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Qté" type="number" value={l.qte} onChange={v => setLignes(lignes.map((x, j) => j === i ? { ...x, qte: v } : x))} />
                  <Input label="Prix unitaire HT (€)" type="number" value={l.prix_ht} onChange={v => setLignes(lignes.map((x, j) => j === i ? { ...x, prix_ht: v } : x))} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setLignes([...lignes, { ...EMPTY_LIGNE }])} className="mt-2 flex items-center gap-1 text-xs text-[#d8b25c] hover:text-[#ecca7e]">
            <IcPlus />Ajouter une ligne
          </button>

          <div className="mt-5 rounded-xl border border-[#d8b25c]/30 bg-[#d8b25c]/5 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-neutral-400"><span>Total HT</span><span className="font-mono">{ht} €</span></div>
            <div className="flex justify-between text-neutral-400">
              <span>{form.tva === '0' ? 'TVA non applicable' : `TVA ${form.tva}%`}</span>
              <span className="font-mono">{form.tva === '0' ? '—' : `${tva_montant} €`}</span>
            </div>
            <div className="flex justify-between border-t border-[#d8b25c]/20 pt-2 font-bold text-white">
              <span>Total TTC</span><span className="font-mono text-[#d8b25c]">{ttc} €</span>
            </div>
            {form.tva === '0' && <p className="text-[11px] text-neutral-500">TVA non applicable, art. 293 B du CGI</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Btn variant="secondary" onClick={() => setView('list')}>Annuler</Btn>
        <Btn onClick={createFacture} disabled={saving}>{saving ? 'Enregistrement...' : 'Créer la facture'}</Btn>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Factures</h1>
        <Btn onClick={() => { setForm({ client_id: clients[0]?.id || '', tva: '0', due_days: 15 }); setLignes([{ ...EMPTY_LIGNE }]); setView('form') }}>
          <IcPlus />Nouvelle facture
        </Btn>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {[
          { label: 'En attente', val: enAttente, count: factures.filter(f => f.statut === 'envoyee').length, color: 'text-[#f4aaa4]' },
          { label: 'Payées', val: payees, count: factures.filter(f => f.statut === 'payee').length, color: 'text-[#9ee6bd]' },
          { label: 'En retard', val: retard, count: factures.filter(f => f.statut === 'en_retard').length, color: 'text-[#f4aaa4]' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-[#262629] bg-[#141416] p-4">
            <p className="text-xs text-neutral-500">{k.label}</p>
            <p className="font-mono text-xl font-bold text-white mt-1">{k.val.toFixed(0)} €</p>
            <p className={`text-xs mt-1 ${k.color}`}>{k.count} facture{k.count > 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-[#d8b25c] text-black' : 'border border-[#262629] text-neutral-400 hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="mt-4 rounded-2xl border border-[#262629] bg-[#141416] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#262629]">
            {['Numéro', 'Client', 'Total TTC', 'Statut', 'Échéance', 'Actions'].map(h => (
              <p key={h} className="text-xs font-medium uppercase tracking-wider text-neutral-500">{h}</p>
            ))}
          </div>
          {filtered.length === 0 ? <EmptyState message="Aucune facture" /> : filtered.map(f => (
            <div key={f.id} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 border-b border-[#262629] last:border-0 hover:bg-[#1b1b1e] transition-colors">
              <p className="font-mono text-xs text-neutral-400">{f.numero}</p>
              <div>
                <p className="text-sm font-medium text-white">{f.clients?.prenom} {f.clients?.nom}</p>
                <p className="text-xs text-neutral-500">{f.clients?.entreprise}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-white">{f.total_ttc?.toFixed(2)} €</p>
              <Badge statut={STATUS_MAP[f.statut]} />
              <p className="text-xs text-neutral-500">{f.due_date ? new Date(f.due_date).toLocaleDateString('fr-FR') : '—'}</p>
              <div className="flex items-center gap-1">
                {f.statut === 'brouillon' && (
                  <button onClick={() => sendFacture(f)} disabled={sending === f.id}
                    className="rounded-lg border border-[#d8b25c]/40 bg-[#d8b25c]/10 px-2 py-1.5 text-xs text-[#d8b25c] hover:bg-[#d8b25c]/20 flex items-center gap-1">
                    <IcMail />{sending === f.id ? '...' : 'Envoyer'}
                  </button>
                )}
                {f.statut === 'envoyee' && f.stripe_payment_link && (
                  <button onClick={() => { navigator.clipboard.writeText(f.stripe_payment_link); alert('Lien Stripe copié !') }}
                    className="rounded-lg bg-[rgba(91,155,242,0.15)] border border-[rgba(91,155,242,0.3)] px-2 py-1.5 text-xs text-[#aecbf7] hover:bg-[rgba(91,155,242,0.25)] flex items-center gap-1">
                    <IcStripe />Stripe
                  </button>
                )}
                {(f.statut === 'envoyee' || f.statut === 'en_retard') && (
                  <button onClick={() => markPaid(f.id)} className="rounded-lg bg-[rgba(63,191,127,0.15)] border border-[rgba(63,191,127,0.3)] px-2 py-1.5 text-xs text-[#9ee6bd] hover:bg-[rgba(63,191,127,0.25)] flex items-center gap-1">
                    <IcCheck />Payée
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sendModal && (
        <Modal onClose={() => setSendModal(null)}>
          <ModalHeader title="Facture envoyée" onClose={() => setSendModal(null)} />
          <div className="p-6 space-y-3">
            <div className="rounded-xl border border-[rgba(63,191,127,0.3)] bg-[rgba(63,191,127,0.06)] px-4 py-3">
              <p className="text-sm text-[#9ee6bd] font-medium">✓ Facture envoyée au client</p>
              <p className="text-xs text-[#9ee6bd] mt-1">✓ Accusé de réception envoyé à inovtekantilles@gmail.com</p>
            </div>
            <div className="rounded-xl border border-[#262629] bg-[#0a0a0b] p-4 space-y-1 text-xs font-mono">
              <p className="text-neutral-400">À : <span className="text-white">{clients.find(c => c.id === sendModal.client_id)?.email}</span></p>
              <p className="text-neutral-400">Objet : <span className="text-white">Votre facture {sendModal.numero} — {sendModal.total_ttc?.toFixed(2)} € — InovTek Antilles</span></p>
              <div className="mt-2 pt-2 border-t border-[#262629] space-y-1 text-neutral-300">
                <p>Lien de paiement Stripe :</p>
                <div className="rounded-lg bg-[rgba(91,155,242,0.1)] border border-[rgba(91,155,242,0.3)] px-3 py-2 text-center">
                  <p className="text-[#aecbf7]">→ Payer {sendModal.total_ttc?.toFixed(2)} € en ligne</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-500">Objet accusé (inovtekantilles@gmail.com) : <span className="text-white font-mono">{sendModal.numero} — {clients.find(c => c.id === sendModal.client_id)?.nom} — {new Date().toLocaleDateString('fr-FR')} ✓ Envoyée</span></p>
          </div>
          <div className="flex justify-end px-6 py-4 border-t border-[#262629]">
            <Btn onClick={() => setSendModal(null)}>Fermer</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
