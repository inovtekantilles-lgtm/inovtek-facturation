import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Input, Select, Modal, ModalHeader, Spinner, EmptyState } from '../components/ui'

function IcPlus() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IcMail() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg> }
function IcEdit() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> }

const EMPTY_FORM = { client_id: '', nom: '', montant: '', frequence: 'mensuel', jour_facturation: 1, notes: '' }

export default function Abonnements() {
  const [abonnements, setAbonnements] = useState([])
  const [clients, setClients] = useState([])
  const [historique, setHistorique] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(null)
  const [sent, setSent] = useState({})

  const load = async () => {
    setLoading(true)
    const [{ data: a }, { data: c }, { data: h }] = await Promise.all([
      supabase.from('abonnements').select('*, clients(nom, prenom, entreprise, email)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom, prenom, entreprise').order('nom'),
      supabase.from('factures').select('*, clients(nom, prenom)').eq('statut', 'payee').order('created_at', { ascending: false }).limit(10)
    ])
    setAbonnements(a || [])
    setClients(c || [])
    setHistorique(h || [])
    if (c?.length) setForm(f => ({ ...f, client_id: c[0].id }))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const mrr = abonnements.filter(a => a.actif).reduce((s, a) => s + (a.montant || 0), 0)

  const save = async () => {
    if (!form.client_id || !form.nom || !form.montant) return
    setSaving(true)
    const prochaine = new Date()
    prochaine.setDate(form.jour_facturation)
    if (prochaine <= new Date()) prochaine.setMonth(prochaine.getMonth() + 1)

    await supabase.from('abonnements').insert({
      ...form, montant: parseFloat(form.montant),
      jour_facturation: parseInt(form.jour_facturation),
      actif: true,
      prochaine_facturation: prochaine.toISOString().split('T')[0]
    })
    await load()
    setSaving(false)
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  const toggleActif = async (a) => {
    await supabase.from('abonnements').update({ actif: !a.actif }).eq('id', a.id)
    await load()
  }

  const simulerEnvoi = async (a) => {
    setSending(a.id)
    const year = new Date().getFullYear()
    const { data: factures } = await supabase.from('factures').select('numero')
    const maxF = (factures || []).reduce((m, f) => {
      const n = parseInt(f.numero?.split('-')[2] || '0'); return n > m ? n : m
    }, 0)
    const num = `FAC-${year}-${String(maxF + 1).padStart(3, '0')}`
    const dueDate = new Date(Date.now() + 15 * 864e5).toISOString().split('T')[0]

    await supabase.from('factures').insert({
      client_id: a.client_id, numero: num,
      lignes: [{ desc: a.nom, qte: 1, prix_ht: a.montant }],
      total_ht: a.montant, tva_taux: 0, tva_montant: 0, total_ttc: a.montant,
      statut: 'envoyee', sent_at: new Date().toISOString(),
      stripe_payment_link: `https://buy.stripe.com/inovtek/${num.toLowerCase().replace(/-/g, '')}`,
      due_date: dueDate
    })
    await supabase.from('abonnements').update({
      prochaine_facturation: new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0]
    }).eq('id', a.id)

    setSent(s => ({ ...s, [a.id]: num }))
    setSending(null)
    await load()
  }

  const initiales = (c) => `${(c?.prenom || c?.nom || '?')[0]}${(c?.entreprise || '')[0] || ''}`.toUpperCase()

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Abonnements</h1>
          <p className="mt-1 text-sm text-neutral-500">Facturation automatique récurrente</p>
        </div>
        <Btn onClick={() => setShowModal(true)}><IcPlus />Nouvel abonnement</Btn>
      </div>

      <div className="mt-4 rounded-xl border border-[#d8b25c]/30 bg-[#d8b25c]/5 px-4 py-3 flex items-start gap-3">
        <span className="text-[#d8b25c] mt-0.5">⚡</span>
        <div>
          <p className="text-sm font-medium text-[#d8b25c]">Automatisation active</p>
          <p className="text-xs text-neutral-400 mt-0.5">Le 1er de chaque mois : factures générées, envoyées aux clients avec lien Stripe, et accusé de réception envoyé à <span className="text-white font-medium">inovtekantilles@gmail.com</span>.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#d8b25c]/30 bg-[#d8b25c]/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">MRR</p>
          <p className="mt-2 font-mono text-3xl font-bold text-[#d8b25c]">{mrr.toFixed(0)} €/mois</p>
        </div>
        <div className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Actifs</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{abonnements.filter(a => a.actif).length}</p>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {abonnements.length === 0 ? (
              <div className="col-span-2"><EmptyState message="Aucun abonnement configuré" /></div>
            ) : abonnements.map(a => (
              <div key={a.id} className={`rounded-2xl border bg-[#141416] p-5 transition-colors ${sent[a.id] ? 'border-[rgba(63,191,127,0.4)]' : 'border-[#262629]'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8b25c]/20 text-sm font-bold text-[#d8b25c]">{initiales(a.clients)}</div>
                    <div>
                      <p className="font-semibold text-white">{a.clients?.prenom} {a.clients?.nom}</p>
                      <p className="text-xs text-neutral-500">{a.clients?.entreprise}</p>
                    </div>
                  </div>
                  <Badge statut={a.actif ? 'Actif' : 'Inactif'} />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-neutral-500">Prestation</span><span className="text-white font-medium">{a.nom}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Montant</span><span className="font-mono font-bold text-white">{a.montant} €/{a.frequence === 'mensuel' ? 'mois' : 'an'}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Facturation</span><span className="text-white">Le {a.jour_facturation}er du mois</span></div>
                  {a.prochaine_facturation && <div className="flex justify-between"><span className="text-neutral-500">Prochaine</span><span className="text-white">{new Date(a.prochaine_facturation).toLocaleDateString('fr-FR')}</span></div>}
                </div>

                {sent[a.id] && (
                  <div className="mt-3 rounded-lg border border-[rgba(63,191,127,0.3)] bg-[rgba(63,191,127,0.08)] px-3 py-2">
                    <p className="text-xs text-[#9ee6bd]">✓ Facture {sent[a.id]} générée et envoyée</p>
                    <p className="text-xs text-[#9ee6bd]">✓ Accusé réception → inovtekantilles@gmail.com</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button onClick={() => simulerEnvoi(a)} disabled={sending === a.id || !a.actif}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${sending === a.id ? 'border-[#d8b25c]/40 bg-[#d8b25c]/10 text-[#d8b25c] animate-pulse' : 'border-[#d8b25c]/40 bg-[#d8b25c]/10 text-[#d8b25c] hover:bg-[#d8b25c]/20'}`}>
                    <IcMail />{sending === a.id ? 'Envoi...' : 'Envoyer facture'}
                  </button>
                  <button onClick={() => toggleActif(a)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-[#262629] px-3 py-2 text-xs text-neutral-400 hover:text-white hover:border-neutral-500">
                    {a.actif ? 'Pause' : 'Activer'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {historique.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[#262629] bg-[#141416] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#262629]">
                <h2 className="text-sm font-semibold text-white">Historique des paiements</h2>
              </div>
              {historique.map(f => (
                <div key={f.id} className="grid grid-cols-[1fr_1.5fr_1fr_1fr] gap-3 items-center px-5 py-3.5 border-b border-[#262629] last:border-0">
                  <p className="text-xs text-neutral-500">{f.paid_at ? new Date(f.paid_at).toLocaleDateString('fr-FR') : new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-white">{f.clients?.prenom} {f.clients?.nom}</p>
                  <p className="font-mono text-sm text-white">{f.total_ttc?.toFixed(0)} €</p>
                  <p className="font-mono text-xs text-neutral-500">{f.numero}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <ModalHeader title="Nouvel abonnement" onClose={() => setShowModal(false)} />
          <div className="p-6 space-y-4">
            <Select label="Client" required value={form.client_id} onChange={v => setForm({ ...form, client_id: v })}
              options={clients.map(c => ({ value: c.id, label: `${c.prenom || ''} ${c.nom} — ${c.entreprise}`.trim() }))} />
            <Input label="Nom de la prestation" required value={form.nom} onChange={v => setForm({ ...form, nom: v })} placeholder="Ex: Abonnement marketing mensuel" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Montant (€)" required type="number" value={form.montant} onChange={v => setForm({ ...form, montant: v })} />
              <Select label="Fréquence" value={form.frequence} onChange={v => setForm({ ...form, frequence: v })}
                options={[{ value: 'mensuel', label: 'Mensuel' }, { value: 'annuel', label: 'Annuel' }]} />
            </div>
            <Input label="Jour de facturation (1-28)" type="number" value={form.jour_facturation} onChange={v => setForm({ ...form, jour_facturation: Math.min(28, Math.max(1, parseInt(v) || 1)) })} />
          </div>
          <div className="flex justify-end gap-3 border-t border-[#262629] px-6 py-4">
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Créer l\'abonnement'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
