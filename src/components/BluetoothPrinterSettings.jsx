import { useEffect, useState } from 'react'
import { Bluetooth, BluetoothOff, Loader2, TestTube, AlertCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import {
  isBluetoothSupported, connectPrinterBluetooth, disconnectPrinter, isPrinterConnected,
  onPrinterStatusChange, loadPrinterConfig, savePrinterConfig, printTestPage,
  getConnectedPrinterName, getSavedPrinterName, reconnectBluetoothPrinter,
} from '../lib/thermalPrinter'

function Toggle({ checked, onChange, label, desc }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl bg-dark-primary/50 border border-brand-gold/10 cursor-pointer">
      <div>
        <p className="text-cream text-sm">{label}</p>
        {desc && <p className="text-muted text-xs">{desc}</p>}
      </div>
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-dark-tertiary rounded-full peer-checked:bg-brand-gold transition-all" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-all" />
      </div>
    </label>
  )
}

// The shop uses one Bluetooth thermal printer: connect, test, paper width, auto-print.
export default function BluetoothPrinterSettings() {
  const { language } = useLanguage()
  const ta = language === 'ta'
  const supported = isBluetoothSupported()
  const [connected, setConnected] = useState(isPrinterConnected())
  const [name, setName] = useState(getConnectedPrinterName())
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState(loadPrinterConfig())
  const saved = getSavedPrinterName()

  useEffect(() => {
    reconnectBluetoothPrinter()
    return onPrinterStatusChange(({ connected: c }) => {
      setConnected(c)
      setName(getConnectedPrinterName())
    })
  }, [])

  const connect = async () => {
    setBusy(true)
    const r = await connectPrinterBluetooth()
    setBusy(false)
    if (r.success) toast.success(r.message)
    else toast.error(r.message)
  }
  const disconnect = async () => {
    await disconnectPrinter()
    toast.success(ta ? 'பிரிண்டர் துண்டிக்கப்பட்டது' : 'Printer disconnected')
  }
  const test = async () => {
    const r = await printTestPage()
    if (r.success) toast.success(ta ? 'டெஸ்ட் பிரிண்ட் அனுப்பப்பட்டது!' : 'Test print sent!')
    else toast.error(r.needsConnect ? (ta ? 'முதலில் பிரிண்டரை இணைக்கவும்' : 'Connect the printer first') : r.message)
  }
  const change = (key, value) => setConfig(savePrinterConfig({ [key]: value }))

  return (
    <div className="card p-6 space-y-5">
      <h2 className="text-lg font-semibold text-cream flex items-center gap-2">
        <Bluetooth className="text-brand-gold" size={22} /> {ta ? 'Bluetooth பிரிண்டர்' : 'Bluetooth Printer'}
      </h2>

      {!supported ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <AlertCircle className="text-yellow-400 mt-0.5 shrink-0" size={20} />
          <div className="text-sm">
            <p className="text-yellow-300 font-medium">{ta ? 'இந்த பிரவுசரில் Bluetooth பிரிண்ட் இயங்காது' : 'Bluetooth printing does not work in this browser'}</p>
            <p className="text-muted text-xs mt-1">
              {ta
                ? 'பில்லிங் செய்யும் Android போன்/டேப்லெட் அல்லது Windows கணினியில் Google Chrome-ல் இந்த தளத்தை திறக்கவும்.'
                : 'Open this site in Google Chrome on the Android phone/tablet or Windows computer used for billing.'}
            </p>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border-2 ${connected ? 'bg-green-500/10 border-green-500/30' : 'bg-dark-primary/50 border-brand-gold/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connected ? 'bg-green-500/20' : 'bg-muted/20'}`}>
              {connected ? <Bluetooth className="text-green-400" size={22} /> : <BluetoothOff className="text-muted" size={22} />}
            </div>
            <div>
              <p className="text-cream font-medium">{connected ? name : (ta ? 'இணைக்கப்படவில்லை' : 'Not connected')}</p>
              <p className={`text-sm ${connected ? 'text-green-400' : 'text-muted'}`}>
                {connected ? (ta ? '✅ இணைக்கப்பட்டது' : '✅ Connected') : saved ? `${ta ? 'கடைசி பிரிண்டர்' : 'Last printer'}: ${saved}` : (ta ? 'பிரிண்டரை ஆன் செய்து இணைக்கவும்' : 'Turn the printer on and connect')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {connected ? (
              <>
                <button onClick={test} className="px-4 py-2 rounded-lg bg-brand-gold text-dark-primary font-semibold text-sm flex items-center gap-2"><TestTube size={16} /> {ta ? 'டெஸ்ட் பிரிண்ட்' : 'Test Print'}</button>
                <button onClick={disconnect} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm">{ta ? 'துண்டி' : 'Disconnect'}</button>
              </>
            ) : (
              <button onClick={connect} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 text-sm disabled:opacity-50 flex items-center gap-2">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Bluetooth size={16} />} {ta ? 'பிரிண்டரை இணை' : 'Connect Printer'}
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="text-muted text-sm mb-2 block">{ta ? 'தாள் அகலம்' : 'Paper width'}</label>
        <div className="flex gap-3">
          {[{ v: 80, d: ta ? 'பெரிய பிரிண்டர்' : 'Standard' }, { v: 58, d: ta ? 'சிறிய பிரிண்டர்' : 'Compact' }].map((o) => (
            <button key={o.v} onClick={() => change('paperWidth', o.v)} className={`flex-1 p-3 rounded-xl border-2 text-center ${config.paperWidth === o.v ? 'border-brand-gold bg-brand-gold/10' : 'border-brand-gold/20 hover:border-brand-gold/40'}`}>
              <p className="text-cream font-bold text-lg">{o.v}mm</p>
              <p className="text-muted text-xs">{o.d}</p>
            </button>
          ))}
        </div>
      </div>

      <Toggle
        checked={!!config.autoPrint}
        onChange={(v) => change('autoPrint', v)}
        label={ta ? 'ஆர்டர் பின் தானியங்கி பிரிண்ட்' : 'Auto-print after order'}
        desc={ta ? 'பிரிண்டர் இணைந்திருந்தால் ஆர்டர் வைத்தவுடன் ரசீது அச்சாகும்' : 'Prints the receipt as soon as the order is placed (when the printer is connected)'}
      />

      <div className="flex gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs leading-relaxed">
        <Info size={16} className="shrink-0 mt-0.5" />
        <ul className="list-disc pl-4 space-y-0.5">
          <li>{ta ? 'Google Chrome பயன்படுத்தவும். போனில் Bluetooth-ஐயும் Location-ஐயும் ஆன் செய்யவும்.' : 'Use Google Chrome. On a phone, turn on Bluetooth and Location.'}</li>
          <li>{ta ? 'பிரிண்டரை போனின் Bluetooth அமைப்பில் pair செய்ய வேண்டாம் — இங்கே "பிரிண்டரை இணை" அழுத்தி பட்டியலில் தேர்வு செய்யவும்.' : 'Do not pair the printer in the phone\u2019s Bluetooth settings — press "Connect Printer" here and pick it from the list.'}</li>
          <li>{ta ? 'பக்கத்தை ரீலோட் செய்தால் இணைப்பு போகலாம்; ரசீது திரையில் "இணைத்து அச்சிடு" அழுத்தினால் போதும்.' : 'After a page reload the connection may drop; just press "Connect & print" on the receipt.'}</li>
        </ul>
      </div>
    </div>
  )
}
