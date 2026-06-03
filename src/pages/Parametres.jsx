import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Input, Textarea } from '../components/ui'

// Les clés API ne sont JAMAIS affichées dans l'interface.
// Elles sont gérées uniquement dans le fichier .env.local

export default function Parametres() {
  const [form, setForm] = useState({
    nom_entreprise: 'InovTek Antilles',
    adresse: '',
    siret: '',
    email_contact: 'inovtekantilles@gmail.com',
    telephone: '0590 92 80 89',
    prefixe_devis: 'DEV',
    prefixe_facture: 'FAC',
    prochain_num_devis: 1,
    prochain_num_facture: 1,
    relance_auto: true,
    relance_delai_jours: 7,
    mentions_legales: 'TVA non applicable, art. 293 B du CGI.',
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('parametres').select('*').single()
      if (data) setForm(f => ({ ...f, ...data }))
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    await supabase.from('parametres').upsert({ ...form, id: 1, updated_at: new Date().toISOString() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#262629] border-t-[#d8b25c]" /></div>

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <h1 className="text-2xl font-bold text-white mb-6">Paramètres</h1>

      <div className="space-y-5">
        {/* Infos entreprise */}
        <section className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Informations de l'entreprise</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nom de l'entreprise" value={form.nom_entreprise} onChange={v => setForm({ ...form, nom_entreprise: v })} />
              <Input label="Téléphone" value={form.telephone} onChange={v => setForm({ ...form, telephone: v })} />
            </div>
            <Input label="Adresse" value={form.adresse} onChange={v => setForm({ ...form, adresse: v })} placeholder="Vieux-Habitants, 97119, Guadeloupe" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Email de contact" type="email" value={form.email_contact} onChange={v => setForm({ ...form, email_contact: v })} />
              <Input label="SIRET" value={form.siret} onChange={v => setForm({ ...form, siret: v })} placeholder="000 000 000 00000" />
            </div>
            <Textarea label="Mention légale (bas de facture)" value={form.mentions_legales} onChange={v => setForm({ ...form, mentions_legales: v })} rows={2} />
            <div className="rounded-xl border border-[#d8b25c]/20 bg-[#d8b25c]/5 px-4 py-3">
              <p className="text-xs text-[#d8b25c] font-medium">Micro-entrepreneur</p>
              <p className="text-xs text-neutral-400 mt-1">Vos informations bancaires ne sont pas affichées sur les devis et factures. Les paiements sont gérés via les liens Stripe.</p>
            </div>
          </div>
        </section>

        {/* Numérotation */}
        <section className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Numérotation automatique</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Préfixe devis" value={form.prefixe_devis} onChange={v => setForm({ ...form, prefixe_devis: v })} />
            <Input label="Préfixe facture" value={form.prefixe_facture} onChange={v => setForm({ ...form, prefixe_facture: v })} />
            <Input label="Prochain numéro devis" type="number" value={form.prochain_num_devis} onChange={v => setForm({ ...form, prochain_num_devis: parseInt(v) || 1 })} />
            <Input label="Prochain numéro facture" type="number" value={form.prochain_num_facture} onChange={v => setForm({ ...form, prochain_num_facture: parseInt(v) || 1 })} />
          </div>
        </section>

        {/* Relances */}
        <section className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Relances automatiques</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Activer les relances</p>
                <p className="text-xs text-neutral-500">Email automatique si une facture n'est pas payée après l'échéance</p>
              </div>
              <button onClick={() => setForm({ ...form, relance_auto: !form.relance_auto })}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.relance_auto ? 'bg-[#d8b25c]' : 'bg-[#262629]'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${form.relance_auto ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            {form.relance_auto && (
              <Input label="Délai de relance (jours après échéance)" type="number" value={form.relance_delai_jours} onChange={v => setForm({ ...form, relance_delai_jours: parseInt(v) || 7 })} />
            )}
            <div className="rounded-xl border border-[#262629] bg-[#0a0a0b] px-4 py-3">
              <p className="text-xs text-neutral-500 mb-1">Format email accusé de réception (factures automatiques)</p>
              <p className="font-mono text-xs text-white">FAC-2026-001 — [Client] — [Date] ✓ Envoyée</p>
            </div>
          </div>
        </section>

        {/* Intégrations — info seulement, pas de clés affichées */}
        <section className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Intégrations</h2>
          <div className="space-y-3">
            {[
              { nom: 'Stripe', statut: true, desc: 'Liens de paiement et webhooks' },
              { nom: 'Resend', statut: true, desc: 'Envoi d\'emails (devis, factures, relances)' },
              { nom: 'Supabase', statut: true, desc: 'Base de données' },
            ].map(i => (
              <div key={i.nom} className="flex items-center justify-between rounded-xl border border-[#262629] bg-[#0a0a0b] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{i.nom}</p>
                  <p className="text-xs text-neutral-500">{i.desc}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${i.statut ? 'bg-[rgba(63,191,127,0.12)] text-[#9ee6bd]' : 'bg-[rgba(138,138,144,0.12)] text-[#bdbdc2]'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${i.statut ? 'bg-[#3fbf7f]' : 'bg-[#8a8a90]'}`} />
                  {i.statut ? 'Configuré' : 'Non configuré'}
                </span>
              </div>
            ))}
            <p className="text-xs text-neutral-500 px-1">Les clés API sont gérées dans le fichier <span className="font-mono text-neutral-400">.env.local</span> du projet. Elles ne sont jamais affichées dans l'interface.</p>
          </div>
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <Btn onClick={save}>
          {saved ? '✓ Enregistré !' : 'Enregistrer'}
        </Btn>
      </div>
    </div>
  )
}
