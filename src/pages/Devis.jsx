import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Input, Textarea, Select, TVASelect, Modal, ModalHeader, Spinner, EmptyState } from '../components/ui'

const EMPTY_LIGNE = { desc: '', qte: 1, prix_ht: 0 }

function calcTotaux(lignes, tva) {
  const ht = lignes.reduce((s, l) => s + (parseFloat(l.prix_ht) || 0) * (parseInt(l.qte) || 1), 0)
  const rate = parseFloat(tva) / 100
  const tva_montant = ht * rate
  return { ht: ht.toFixed(2), tva_montant: tva_montant.toFixed(2), ttc: (ht + tva_montant).toFixed(2) }
}

function IcPlus() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IcEye() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.6"/></svg> }
function IcArrow() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> }
function IcMail() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg> }
function IcTrash() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg> }

export default function Devis() {
  const [devis, setDevis] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('Tous')
  const [sending, setSending] = useState(null)
  const [form, setForm] = useState({ client_id: '', titre: '', tva: '0', validite_jours: 30, notes: '' })
  const [lignes, setLignes] = useState([{ ...EMPTY_LIGNE }])
  const [saving, setSaving] = useState(false)
  const [sendModal, setSendModal] = useState(null)

  const load = async () => {
    setLoading(true)
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from('devis').select('*, clients(nom, prenom, entreprise, email)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom, prenom, entreprise, email').order('nom')
    ])
    setDevis(d || [])
    setClients(c || [])
    if (c?.length && !form.client_id) setForm(f => ({ ...f, client_id: c[0].id }))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const { ht, tva_montant, ttc } = calcTotaux(lignes, form.tva)

  const nextNum = () => {
    const year = new Date().getFullYear()
    const max = devis.reduce((m, d) => {
      const n = parseInt(d.numero?.split('-')[2] || '0')
      return n > m ? n : m
    }, 0)
    return `DEV-${year}-${String(max + 1).padStart(3, '0')}`
  }

  const createDevis = async (statut = 'brouillon') => {
    if (!form.client_id || !form.titre) return
    setSaving(true)
    const { data } = await supabase.from('devis').insert({
      client_id: form.client_id, numero: nextNum(), titre: form.titre,
      lignes, total_ht: parseFloat(ht), tva_taux: parseFloat(form.tva),
      tva_montant: parseFloat(tva_montant), total_ttc: parseFloat(ttc),
      statut, validite_jours: form.validite_jours, notes: form.notes,
      ...(statut === 'envoye' ? { sent_at: new Date().toISOString() } : {})
    }).select().single()
    await load()
    setSaving(false)
    if (statut === 'envoye' && data) setSendModal(data)
    else setView('list')
  }

  const sendDevis = async (d) => {
    setSending(d.id)
    await supabase.from('devis').update({ statut: 'envoye', sent_at: new Date().toISOString() }).eq('id', d.id)
    await load()
    setSending(null)
    setSendModal(d)
  }

  const convertToFacture = async (d) => {
    const year = new Date().getFullYear()
    const { data: factures } = await supabase.from('factures').select('numero')
    const maxF = (factures || []).reduce((m, f) => {
      const n = parseInt(f.numero?.split('-')[2] || '0')
      return n > m ? n : m
    }, 0)
    const numF = `FAC-${year}-${String(maxF + 1).padStart(3, '0')}`
    await supabase.from('factures').insert({
      client_id: d.client_id, devis_id: d.id, numero: numF,
      lignes: d.lignes, total_ht: d.total_ht, tva_taux: d.tva_taux,
      tva_montant: d.tva_montant, total_ttc: d.total_ttc, statut: 'brouillon',
      due_date: new Date(Date.now() + 15 * 864e5).toISOString().split('T')[0]
    })
    await supabase.from('devis').update({ statut: 'envoye' }).eq('id', d.id)
    alert(`Devis converti en facture ${numF} avec succès !`)
    await load()
  }

  const STATUS_MAP = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' }
  const FILTERS = ['Tous', 'Brouillon', 'Envoyé', 'Accepté', 'Refusé']
  const filtered = filter === 'Tous' ? devis : devis.filter(d => STATUS_MAP[d.statut] === filter)

  if (view === 'form') return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('list')} className="text-neutral-400 hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
        </button>
        <h1 className="text-2xl font-bold text-white">Nouveau devis</h1>
        <span className="font-mono text-sm text-neutral-500 bg-[#141416] border border-[#262629] rounded-lg px-3 py-1">{nextNum()}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Select label="Client professionnel" required value={form.client_id} onChange={v => setForm({ ...form, client_id: v })}
            options={clients.map(c => ({ value: c.id, label: `${c.prenom || ''} ${c.nom} — ${c.entreprise}`.trim() }))} />
          <Input label="Titre du devis" required value={form.titre} onChange={v => setForm({ ...form, titre: v })} placeholder="Ex: Stratégie marketing Q3 2026" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Validité (jours)" type="number" value={form.validite_jours} onChange={v => setForm({ ...form, validite_jours: v })} />
            <TVASelect value={form.tva} onChange={v => setForm({ ...form, tva: v })} />
          </div>
          <Textarea label="Notes internes (non visibles sur le document)" value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Prestations</p>
          </div>
          <div className="space-y-2">
            {lignes.map((l, i) => (
              <div key={i} className="rounded-xl border border-[#262629] bg-[#0a0a0b] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={l.desc} onChange={e => setLignes(lignes.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))}
                    placeholder="Description de la prestation"
                    className="flex-1 rounded-lg border border-[#262629] bg-[#141416] px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[#d8b25c] focus:outline-none" />
                  <button onClick={() => setLignes(lignes.filter((_, j) => j !== i))} className="text-neutral-600 hover:text-red-400 shrink-0">
                    <IcTrash />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Qté" type="number" value={l.qte} onChange={v => setLignes(lignes.map((x, j) => j === i ? { ...x, qte: v } : x))} />
                  <Input label="Prix unitaire HT (€)" type="number" value={l.prix_ht} onChange={v => setLignes(lignes.map((x, j) => j === i ? { ...x, prix_ht: v } : x))} />
                </div>
                <p className="text-right text-xs text-neutral-500">= {((parseFloat(l.prix_ht) || 0) * (parseInt(l.qte) || 1)).toFixed(2)} €</p>
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
        <Btn variant="secondary" onClick={() => createDevis('brouillon')} disabled={saving}>Enregistrer brouillon</Btn>
        <Btn onClick={() => createDevis('envoye')} disabled={saving}><IcMail />Enregistrer et envoyer</Btn>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-white">Devis</h1>
        <Btn onClick={() => { setForm({ client_id: clients[0]?.id || '', titre: '', tva: '0', validite_jours: 30, notes: '' }); setLignes([{ ...EMPTY_LIGNE }]); setView('form') }}>
          <IcPlus />Nouveau devis
        </Btn>
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
          <div className="hidden sm:grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#262629]">
            {['Numéro', 'Client / Titre', 'Total TTC', 'Statut', 'Date', 'Actions'].map(h => (
              <p key={h} className="text-xs font-medium uppercase tracking-wider text-neutral-500">{h}</p>
            ))}
          </div>
          {filtered.length === 0 ? <EmptyState message="Aucun devis" /> : filtered.map(d => (
            <div key={d.id} className="grid grid-cols-[1fr_2fr_1.5fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 border-b border-[#262629] last:border-0 hover:bg-[#1b1b1e] transition-colors">
              <p className="font-mono text-xs text-neutral-400">{d.numero}</p>
              <div>
                <p className="text-sm font-medium text-white">{d.clients?.prenom} {d.clients?.nom}</p>
                <p className="text-xs text-neutral-500 truncate">{d.titre}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-white">{d.total_ttc?.toFixed(2)} €</p>
              <Badge statut={STATUS_MAP[d.statut]} />
              <p className="text-xs text-neutral-500">{new Date(d.created_at).toLocaleDateString('fr-FR')}</p>
              <div className="flex items-center gap-1">
                {d.statut === 'brouillon' && (
                  <button onClick={() => sendDevis(d)} disabled={sending === d.id}
                    className="rounded-lg border border-[#d8b25c]/40 bg-[#d8b25c]/10 px-2 py-1.5 text-xs text-[#d8b25c] hover:bg-[#d8b25c]/20 flex items-center gap-1">
                    <IcMail />{sending === d.id ? '...' : 'Envoyer'}
                  </button>
                )}
                {d.statut === 'accepte' && (
                  <button onClick={() => convertToFacture(d)}
                    className="rounded-lg bg-[rgba(63,191,127,0.15)] border border-[rgba(63,191,127,0.3)] px-2 py-1.5 text-xs text-[#9ee6bd] hover:bg-[rgba(63,191,127,0.25)] flex items-center gap-1 whitespace-nowrap">
                    <IcArrow />Facturer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sendModal && (
        <Modal onClose={() => { setSendModal(null); setView('list') }} size="md">
          <ModalHeader title="Email envoyé au client" onClose={() => { setSendModal(null); setView('list') }} />
          <div className="p-6 space-y-3">
            <div className="rounded-xl border border-[rgba(63,191,127,0.3)] bg-[rgba(63,191,127,0.06)] px-4 py-3">
              <p className="text-sm text-[#9ee6bd] font-medium">✓ Devis {sendModal.numero} envoyé</p>
            </div>
            <div className="rounded-xl border border-[#262629] bg-[#0a0a0b] p-4 space-y-2 text-xs font-mono">
              <p className="text-neutral-400">À : <span className="text-white">{clients.find(c => c.id === sendModal.client_id)?.email}</span></p>
              <p className="text-neutral-400">Objet : <span className="text-white">Votre devis {sendModal.numero} — {sendModal.total_ttc?.toFixed(2)} € — InovTek Antilles</span></p>
              <div className="mt-2 pt-2 border-t border-[#262629] text-neutral-300 space-y-1">
                <p>Bonjour,</p>
                <p>Veuillez trouver ci-joint votre devis <strong className="text-white">{sendModal.numero}</strong>.</p>
                <p>Montant : <strong className="text-white">{sendModal.total_ttc?.toFixed(2)} €</strong></p>
                {sendModal.tva_taux == 0 && <p className="text-neutral-500">TVA non applicable, art. 293 B du CGI.</p>}
                <p>Validité : {sendModal.validite_jours} jours.</p>
                <p className="pt-1">Cordialement,<br /><strong className="text-white">Kévin HONORE — InovTek Antilles</strong></p>
              </div>
            </div>
          </div>
          <div className="flex justify-end px-6 py-4 border-t border-[#262629]">
            <Btn onClick={() => { setSendModal(null); setView('list') }}>Fermer</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
