import { useMemo, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabase'
import { csvToMenu, importMenu } from '../lib/menuImport'
import { dbErrorMessage } from '../lib/billing'

const SAMPLE = 'Category,Item,Price,Description,Variant,Cost\nMandi,Chicken Mandi,150,,Single,80\nMojito & Drinks,Mint Mojito,90,,,25\n'

export default function MenuImportModal({ onClose, onDone }) {
  const { t, language } = useLanguage()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const parsed = useMemo(() => (text.trim() ? csvToMenu(text) : { items: [], errors: [] }), [text])

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) { toast.error('File too large (max 2 MB)'); return }
    setText(await f.text())
  }

  const run = async () => {
    if (!parsed.items.length) return
    setBusy(true)
    try {
      const r = await importMenu(supabase, parsed.items)
      toast.success(language === 'ta'
        ? `${r.createdItems} பொருட்கள், ${r.createdCats} வகைகள் சேர்க்கப்பட்டன. ${r.skipped} ஏற்கனவே உள்ளன.`
        : `Added ${r.createdItems} items and ${r.createdCats} categories. Skipped ${r.skipped} existing.${r.costsSaved ? ` Saved ${r.costsSaved} cost prices.` : ''}`)
      onDone()
    } catch (err) {
      toast.error(dbErrorMessage(err, language))
    }
    setBusy(false)
  }

  return (
    <Modal
      wide
      title={t('importCsv')}
      onClose={busy ? undefined : onClose}
      footer={(
        <button onClick={run} disabled={busy || !parsed.items.length} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} {t('importNow')} ({parsed.items.length})
        </button>
      )}
    >
      <div className="space-y-3">
        <p className="text-muted text-sm">{t('importHelp')}</p>
        <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer py-2 px-4">
          <Upload size={16} /> {t('chooseFile')}
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />
        </label>
        <textarea className="input font-mono text-xs" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={`${t('pasteCsv')}\n\n${SAMPLE}`} />
        {parsed.errors.length > 0 && (
          <ul className="text-red-400 text-xs space-y-0.5 max-h-24 overflow-y-auto">
            {parsed.errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
        {parsed.items.length > 0 && (
          <div>
            <p className="text-cream text-sm mb-1">{t('preview')}</p>
            <div className="max-h-48 overflow-y-auto border border-brand-gold/10 rounded-lg">
              <table className="w-full text-xs">
                <tbody>
                  {parsed.items.slice(0, 200).map((it, i) => (
                    <tr key={i} className="border-b border-brand-gold/10 last:border-0">
                      <td className="p-1.5 text-muted">{it.category}</td>
                      <td className="p-1.5 text-cream">{it.name}{it.variant ? ` (${it.variant})` : ''}</td>
                      <td className="p-1.5 text-right font-mono text-brand-gold">₹{it.price}</td>
                      <td className="p-1.5 text-right font-mono text-muted">{it.cost != null ? `₹${it.cost}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
