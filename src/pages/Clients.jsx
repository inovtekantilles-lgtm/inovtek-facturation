import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Input, Textarea, Select, Modal, ModalHeader, Spinner, EmptyState } from '../components/ui'

const EMPTY_FORM = { nom: '', prenom: '', entreprise: '', email: '', telephone: '', adresse: '', kbis: '', iban: '', type: 'ponctuel', notes: '' }

function IcEye() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.6"/></svg> }
function IcEyeOff() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10 10 0 0 1 12 19c-7 0-10-7-10-7a18.06 18.06 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 10 7 10 7a18.07 18.07 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></svg> }
function IcPlus() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }
function IcEdit() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> }
function IcTrash() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg> }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showIBAN, setShowIBAN] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = clients.filter(c =>
    `${c.nom} ${c.prenom} ${c.entreprise} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true) }
  const openEdit = (c) => {
    setForm({ nom: c.nom || '', prenom: c.prenom || '', entreprise: c.entreprise || '', email: c.email || '', telephone: c.telephone || '', adresse: c.adresse || '', kbis: c.kbis || '', iban: c.iban || '', type: c.type || 'ponctuel', notes: c.notes || '' })
    setEditId(c.id)
    setShowModal(true)
  }

  const save = async () => {
    if (!form.nom || !form.email || !form.entreprise) return
    setSaving(true)
    if (editId) {
      await supabase.from('clients').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editId)
    } else {
      await supabase.from('clients').insert(form)
    }
    await load()
    setSaving(false)
    setShowModal(false)
    setEditId(null)
  }

  const deleteClient = async (id) => {
    if (!confirm('Supprimer ce client ?')) return
    await supabase.from('clients').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    await load()
  }

  const initiales = (c) => `${(c.prenom || c.nom || '?')[0]}${(c.entreprise || '')[0] || ''}`.toUpperCase()

  const maskIBAN = (iban) => iban ? iban.slice(0, 4) + ' **** **** **** **** ***' : ''

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Clients</h1>
        <Btn onClick={openNew}><IcPlus />Nouveau client</Btn>
      </div>

      <div className="mt-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..."
          className="w-full rounded-lg border border-[#262629] bg-[#141416] pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d8b25c] focus:outline-none" />
      </div>

      {loading ? <Spinner /> : (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-[#262629] bg-[#141416] overflow-hidden">
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 px-5 py-3 border-b border-[#262629]">
              {['Client / Entreprise', 'Email', 'Type', 'Kbis', ''].map(h => (
                <p key={h} className="text-xs font-medium uppercase tracking-wider text-neutral-500">{h}</p>
              ))}
            </div>
            {filtered.length === 0 ? <EmptyState message="Aucun client trouvé" /> : filtered.map(c => (
              <div key={c.id} onClick={() => { setSelected(c); setShowIBAN(false) }}
                className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-3 items-center px-5 py-4 border-b border-[#262629] last:border-0 hover:bg-[#1b1b1e] cursor-pointer transition-colors ${selected?.id === c.id ? 'bg-[#1b1b1e]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d8b25c]/20 text-xs font-bold text-[#d8b25c] shrink-0">{initiales(c)}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-neutral-500">{c.entreprise}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 truncate">{c.email}</p>
                <Badge statut={c.type === 'abonnement' ? 'Abonnement' : 'Ponctuel'} />
                <p className="text-xs text-neutral-500">{c.kbis || '—'}</p>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(c)} className="p-1.5 text-neutral-500 hover:text-white"><IcEdit /></button>
                  <button onClick={() => deleteClient(c.id)} className="p-1.5 text-neutral-500 hover:text-red-400"><IcTrash /></button>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d8b25c]/20 text-base font-bold text-[#d8b25c]">{initiales(selected)}</div>
                <div>
                  <p className="font-bold text-white">{selected.prenom} {selected.nom}</p>
                  <p className="text-xs text-neutral-500">{selected.entreprise}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                {selected.email && <div className="flex items-center gap-2 text-neutral-400"><span>✉</span><span>{selected.email}</span></div>}
                {selected.telephone && <div className="flex items-center gap-2 text-neutral-400"><span>📞</span><span>{selected.telephone}</span></div>}
                {selected.adresse && <div className="flex items-start gap-2 text-neutral-400"><span>📍</span><span>{selected.adresse}</span></div>}
                {selected.kbis && <div className="flex items-center gap-2 text-neutral-400"><span>📋</span><span className="font-mono text-xs">Kbis: {selected.kbis}</span></div>}
              </div>

              {selected.iban && (
                <div className="mt-4 rounded-xl border border-[#262629] bg-[#0a0a0b] p-3">
                  <p className="text-xs font-medium text-neutral-500 mb-2">IBAN (confidentiel)</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-white flex-1">{showIBAN ? selected.iban : maskIBAN(selected.iban)}</p>
                    <button onClick={() => setShowIBAN(!showIBAN)} className="text-neutral-400 hover:text-[#d8b25c]">
                      {showIBAN ? <IcEyeOff /> : <IcEye />}
                    </button>
                  </div>
                </div>
              )}

              <Badge statut={selected.type === 'abonnement' ? 'Abonnement' : 'Ponctuel'} />

              {selected.notes && (
                <div className="mt-3 rounded-xl border border-[#262629] bg-[#0a0a0b] p-3">
                  <p className="text-xs text-neutral-500">{selected.notes}</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Btn variant="secondary" className="flex-1 justify-center text-xs py-2">Nouveau devis</Btn>
                <Btn className="flex-1 justify-center text-xs py-2">Nouvelle facture</Btn>
              </div>
              <button onClick={() => openEdit(selected)} className="mt-2 w-full text-center text-xs text-neutral-500 hover:text-white py-1">Modifier la fiche</button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)} size="lg">
          <ModalHeader title={editId ? 'Modifier le client' : 'Nouveau client professionnel'} onClose={() => setShowModal(false)} />
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nom" value={form.nom} onChange={v => setForm({ ...form, nom: v })} required />
              <Input label="Prénom" value={form.prenom} onChange={v => setForm({ ...form, prenom: v })} />
            </div>
            <Input label="Nom de l'entreprise" value={form.entreprise} onChange={v => setForm({ ...form, entreprise: v })} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email professionnel" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
              <Input label="Téléphone" value={form.telephone} onChange={v => setForm({ ...form, telephone: v })} />
            </div>
            <Input label="Adresse" value={form.adresse} onChange={v => setForm({ ...form, adresse: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Numéro Kbis" value={form.kbis} onChange={v => setForm({ ...form, kbis: v })} placeholder="Ex: 123 456 789" />
              <Select label="Type de client" value={form.type} onChange={v => setForm({ ...form, type: v })} options={[{ value: 'ponctuel', label: 'Ponctuel' }, { value: 'abonnement', label: 'Abonnement récurrent' }]} />
            </div>
            <Input label="IBAN (confidentiel — jamais affiché sur les documents)" value={form.iban} onChange={v => setForm({ ...form, iban: v })} placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" hint="Visible uniquement sur la fiche client, protégé en base de données." />
            <Textarea label="Notes internes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Informations complémentaires..." />
          </div>
          <div className="flex justify-end gap-3 border-t border-[#262629] px-6 py-4">
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Annuler</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : editId ? 'Enregistrer' : 'Créer le client'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
