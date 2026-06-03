import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Badge, Btn, Spinner } from '../components/ui'

function IcArrow() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg> }
function IcPlus() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg> }

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const OBJECTIF = 3500

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ ca: 0, charges: 0, factures_att: 0, nb_factures_att: 0, devis_enc: 0 })
  const [recentFactures, setRecentFactures] = useState([])
  const [recentDevis, setRecentDevis] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const now = new Date()
      const debut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

      const [{ data: fMois }, { data: fAll }, { data: dAll }, { data: charges }] = await Promise.all([
        supabase.from('factures').select('total_ttc, statut').gte('created_at', debut).lte('created_at', fin),
        supabase.from('factures').select('*, clients(nom, prenom, entreprise)').order('created_at', { ascending: false }).limit(5),
        supabase.from('devis').select('*, clients(nom, prenom, entreprise)').order('created_at', { ascending: false }).limit(4),
        supabase.from('charges').select('montant, type, actif').eq('actif', true)
      ])

      const ca = (fMois || []).filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ttc || 0), 0)
      const factures_att = (fAll || []).filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.total_ttc || 0), 0)
      const nb_factures_att = (fAll || []).filter(f => f.statut === 'envoyee').length
      const devis_enc = (dAll || []).filter(d => d.statut === 'envoye').reduce((s, d) => s + (d.total_ttc || 0), 0)
      const ch = (charges || []).filter(c => c.type === 'recurrente').reduce((s, c) => s + (c.montant || 0), 0)

      setStats({ ca, charges: ch, factures_att, nb_factures_att, devis_enc })
      setRecentFactures(fAll || [])
      setRecentDevis(dAll || [])
      setLoading(false)
    }
    load()
  }, [])

  const benefice = stats.ca - stats.charges
  const pct = Math.min(Math.round((benefice / OBJECTIF) * 100), 100)

  const STATUS_F = { brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', en_retard: 'En retard' }
  const STATUS_D = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' }

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-8 fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500 capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Btn onClick={() => onNavigate('devis')}><IcPlus />Nouveau devis</Btn>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'CA du mois', val: `${stats.ca.toFixed(0)} €`, sub: null },
              {
                label: 'Bénéfice net', val: `${benefice.toFixed(0)} €`,
                sub: <><div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#1b1b1e]"><div className="h-full rounded-full bg-[#d8b25c]" style={{ width: `${pct}%` }} /></div><p className="mt-1.5 font-mono text-xs text-[#d8b25c]">{pct}% → objectif {OBJECTIF} €</p></>
              },
              { label: 'Factures en attente', val: `${stats.factures_att.toFixed(0)} €`, sub: <p className="mt-3 text-sm text-[#f4aaa4]">{stats.nb_factures_att} facture{stats.nb_factures_att > 1 ? 's' : ''} à encaisser</p> },
              { label: 'Devis envoyés', val: `${stats.devis_enc.toFixed(0)} €`, sub: <p className="mt-3 text-sm text-[#aecbf7]">en attente de réponse</p> },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border border-[#262629] bg-[#141416] p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{k.label}</p>
                <span className="mt-3 block font-mono text-3xl font-semibold text-white">{k.val}</span>
                {k.sub && <div className="mt-1">{k.sub}</div>}
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#262629] bg-[#141416]">
              <div className="flex items-center justify-between border-b border-[#262629] px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Factures récentes</h2>
                <button onClick={() => onNavigate('factures')} className="text-xs text-neutral-400 hover:text-[#d8b25c] flex items-center gap-1">Tout voir <IcArrow /></button>
              </div>
              {recentFactures.length === 0 ? (
                <p className="px-5 py-8 text-sm text-neutral-500 text-center">Aucune facture</p>
              ) : recentFactures.map(f => (
                <div key={f.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-3.5 border-b border-[#262629] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{f.clients?.prenom} {f.clients?.nom}</p>
                    <p className="font-mono text-xs text-neutral-500">{f.numero}</p>
                  </div>
                  <Badge statut={STATUS_F[f.statut]} />
                  <p className="font-mono text-sm font-semibold text-white">{f.total_ttc?.toFixed(0)} €</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#262629] bg-[#141416]">
              <div className="flex items-center justify-between border-b border-[#262629] px-5 py-4">
                <h2 className="text-sm font-semibold text-white">Devis en cours</h2>
                <button onClick={() => onNavigate('devis')} className="text-xs text-neutral-400 hover:text-[#d8b25c] flex items-center gap-1">Tout voir <IcArrow /></button>
              </div>
              {recentDevis.length === 0 ? (
                <p className="px-5 py-8 text-sm text-neutral-500 text-center">Aucun devis</p>
              ) : recentDevis.map(d => (
                <div key={d.id} className="px-5 py-3.5 border-b border-[#262629] last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{d.clients?.prenom} {d.clients?.nom}</p>
                      <p className="font-mono text-xs text-neutral-500">{d.numero}</p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-white">{d.total_ttc?.toFixed(0)} €</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge statut={STATUS_D[d.statut]} />
                    {d.statut === 'accepte' && (
                      <button onClick={() => onNavigate('factures')} className="text-xs text-[#9ee6bd] hover:underline flex items-center gap-1">
                        <IcArrow />Convertir en facture
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
