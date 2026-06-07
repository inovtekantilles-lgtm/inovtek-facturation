import { createPortal } from 'react-dom'

// Shared UI components
export function Badge({ statut }) {
  const styles = {
    'Payée':      { dot:'#3fbf7f', text:'#9ee6bd', bg:'rgba(63,191,127,0.12)' },
    'Envoyée':    { dot:'#5b9bf2', text:'#aecbf7', bg:'rgba(91,155,242,0.12)' },
    'Envoyé':     { dot:'#5b9bf2', text:'#aecbf7', bg:'rgba(91,155,242,0.12)' },
    'En retard':  { dot:'#f0685f', text:'#f4aaa4', bg:'rgba(240,104,95,0.12)' },
    'Accepté':    { dot:'#3fbf7f', text:'#9ee6bd', bg:'rgba(63,191,127,0.12)' },
    'Refusé':     { dot:'#f0685f', text:'#f4aaa4', bg:'rgba(240,104,95,0.12)' },
    'En attente': { dot:'#d8b25c', text:'#ecd49c', bg:'rgba(216,178,92,0.12)' },
    'Brouillon':  { dot:'#8a8a90', text:'#bdbdc2', bg:'rgba(138,138,144,0.12)' },
    'Actif':      { dot:'#3fbf7f', text:'#9ee6bd', bg:'rgba(63,191,127,0.12)' },
    'Inactif':    { dot:'#f0685f', text:'#f4aaa4', bg:'rgba(240,104,95,0.12)' },
    'Abonnement': { dot:'#d8b25c', text:'#ecd49c', bg:'rgba(216,178,92,0.12)' },
    'Ponctuel':   { dot:'#8a8a90', text:'#bdbdc2', bg:'rgba(138,138,144,0.12)' },
  }
  const s = styles[statut] || styles['Brouillon']
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
      {statut}
    </span>
  )
}

export function Btn({ children, variant = 'primary', onClick, type = 'button', className = '', disabled = false }) {
  const base = 'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[#d8b25c] text-black hover:opacity-90',
    secondary: 'border border-[#262629] bg-[#1b1b1e] text-neutral-200 hover:border-neutral-500',
    danger: 'border border-red-800 bg-red-900/20 text-red-300 hover:bg-red-900/40',
    ghost: 'text-neutral-400 hover:text-white',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder = '', required = false, hint = '', readOnly = false }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-neutral-400">
          {label}{required && <span className="ml-1 text-[#d8b25c]">*</span>}
        </label>
      )}
      <input
        type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder} readOnly={readOnly}
        className="w-full rounded-lg border border-[#262629] bg-[#0a0a0b] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d8b25c] focus:outline-none disabled:opacity-50 read-only:opacity-60"
      />
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

export function Textarea({ label, value, onChange, placeholder = '', rows = 3 }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-xs font-medium text-neutral-400">{label}</label>}
      <textarea value={value ?? ''} onChange={e => onChange?.(e.target.value)} rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#262629] bg-[#0a0a0b] px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-[#d8b25c] focus:outline-none resize-none" />
    </div>
  )
}

export function Select({ label, value, onChange, options = [], required = false }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-neutral-400">
          {label}{required && <span className="ml-1 text-[#d8b25c]">*</span>}
        </label>
      )}
      <select value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-[#262629] bg-[#0a0a0b] px-3 py-2.5 text-sm text-white focus:border-[#d8b25c] focus:outline-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function TVASelect({ value, onChange }) {
  return (
    <Select label="TVA" value={value} onChange={onChange} options={[
      { value: '0', label: 'TVA non applicable (micro-entrepreneur)' },
      { value: '5.5', label: '5,5%' },
      { value: '10', label: '10%' },
      { value: '20', label: '20%' },
    ]} />
  )
}

export function Modal({ children, onClose, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal-in w-full ${widths[size]} max-h-[90vh] flex flex-col rounded-2xl border border-[#262629] bg-[#141416] shadow-2xl`}>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-[#262629] px-6 py-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <button onClick={onClose} className="text-neutral-400 hover:text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#262629] border-t-[#d8b25c]" />
    </div>
  )
}

export function EmptyState({ message = 'Aucun résultat' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mb-3 opacity-40">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13,2 13,9 20,9"/>
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  )
}
