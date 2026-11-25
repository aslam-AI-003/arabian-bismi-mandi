import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className={`bg-dark-secondary border border-brand-gold/20 rounded-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between p-4 border-b border-brand-gold/20">
          <h2 className="text-lg font-bold text-cream">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 text-muted hover:text-cream hover:bg-dark-primary rounded-lg" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-brand-gold/20">{footer}</div>}
      </div>
    </div>
  )
}
