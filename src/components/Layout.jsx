import { useState } from 'react'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></> },
  { key: 'clients', label: 'Clients', path: '/clients', icon: <><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M17 5.2a3 3 0 0 1 .1 5.7M16.5 14.4A5.2 5.2 0 0 1 20.5 19"/></> },
  { key: 'devis', label: 'Devis', path: '/devis', icon: <><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M13 3v5h5"/><path d="M8.5 13h7M8.5 16.5h4"/></> },
  { key: 'factures', label: 'Factures', path: '/factures', icon: <><path d="M6 2.5h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2v-18a1 1 0 0 1 1-1Z"/><path d="M9 8h6M9 11.5h6M9 15h3"/></> },
  { key: 'abonnements', label: 'Abonnements', path: '/abonnements', icon: <><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v4h-4"/></> },
  { key: 'charges', label: 'Charges', path: '/charges', icon: <><path d="M12 4v13M7 12l5 5 5-5"/><path d="M5 20h14"/></> },
  { key: 'parametres', label: 'Paramètres', path: '/parametres', icon: <><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></> },
]

function NavIcon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  )
}

export default function Layout({ children, currentPage, onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#0a0a0b]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#262629] bg-[#0a0a0b] px-4 py-6 lg:flex">
        <div className="px-2 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d8b25c]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 19V8M12 19V5M19 19v-7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">InovTek</p>
              <p className="text-[11px] text-neutral-500">Facturation</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(item => {
            const active = currentPage === item.key
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left ${active ? 'bg-[#141416] text-white' : 'text-neutral-400 hover:bg-[#141416] hover:text-neutral-200'}`}>
                <span className={active ? 'text-[#d8b25c]' : ''}>
                  <NavIcon d={item.icon} />
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 rounded-xl border border-[#262629] bg-[#141416] px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#d8b25c] to-[#b48a3a] text-sm font-bold text-black shrink-0">KH</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Kévin H.</p>
            <p className="truncate text-[11px] text-neutral-500">inovtekantilles97.com</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 lg:pb-0 overflow-x-hidden">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-[#262629] px-5 py-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d8b25c]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a0a0b" strokeWidth="2.4"><path d="M5 19V8M12 19V5M19 19v-7"/></svg>
            </div>
            <span className="text-sm font-bold text-white">InovTek</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#d8b25c] to-[#b48a3a] text-xs font-bold text-black">KH</div>
        </div>

        {children}
      </main>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[#262629] bg-[#0a0a0b]/95 px-2 py-2 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {NAV.slice(0, 5).map(item => {
          const active = currentPage === item.key
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-medium ${active ? 'text-[#d8b25c]' : 'text-neutral-500'}`}>
              <NavIcon d={item.icon} />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
