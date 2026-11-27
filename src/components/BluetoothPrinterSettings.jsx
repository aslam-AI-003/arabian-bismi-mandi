import { useEffect, useState } from 'react'
import { Bluetooth, Smartphone, Monitor, Printer, Loader2, TestTube, CheckCircle2, ExternalLink, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import {
  detectDevice, routeSupport, recommendedRoute, getPrintRoute, setPrintRoute, isRouteReady, connectForRoute,
  disconnectPrinter, onPrinterStatusChange, loadPrinterConfig, savePrinterConfig, printTestPage,
  getConnectedPrinterName, getSavedPrinterName, reconnectBluetoothPrinter, RAWBT_PLAY_STORE,
} from '../lib/thermalPrinter'

const OS_LABEL = { android: 'Android', ios: 'iPhone / iPad', windows: 'Windows PC', mac: 'Mac', other: 'Computer' }

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

/**
 * Printer setup. A website cannot reach every Bluetooth printer directly,
 * so each device prints through the route that works there (see
 * thermalPrinter.js "PRINT ROUTES"). Chosen route is saved on this device.
 */
export default function BluetoothPrinterSettings() {
  const { language } = useLanguage()
  const ta = language === 'ta'
  const device = detectDevice()
  const support = routeSupport()
  const recommended = recommendedRoute()
  const [route, setRoute] = useState(getPrintRoute())
  const [ready, setReady] = useState(isRouteReady())
  const [busy, setBusy] = useState(false)
  const [config, setConfig] = useState(loadPrinterConfig())

  useEffect(() => {
    if (getPrintRoute() === 'bluetooth') reconnectBluetoothPrinter()
    return onPrinterStatusChange(() => setReady(isRouteReady()))
  }, [])

  const choose = async (r) => {
    if (!support[r]) return
    if (r !== route) await disconnectPrinter()
    setPrintRoute(r)
    setRoute(r)
    setReady(isRouteReady(r))
  }
  const connect = async () => {
    setBusy(true)
    const res = await connectForRoute(route)
    setBusy(false)
    setReady(isRouteReady(route))
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }
  const test = async () => {
    setBusy(true)
    let r = await printTestPage()
    if (r.needsConnect) {
      const c = await connectForRoute(route)
      if (!c.success) { setBusy(false); toast.error(c.message); return }
      r = await printTestPage()
    }
    setBusy(false)
    setReady(isRouteReady(route))
    if (r.success) toast.success(r.message || (ta ? 'டெஸ்ட் பிரிண்ட் அனுப்பப்பட்டது!' : 'Test print sent!'))
    else toast.error(r.message)
  }
  const change = (key, value) => setConfig(savePrinterConfig({ [key]: value }))

  const ROUTES = [
    {
      id: 'rawbt', icon: Smartphone,
      title: ta ? 'RawBT ஆப் (Android)' : 'RawBT app (Android)',
      desc: ta ? 'எந்த பிரவுசரிலும். பெரும்பாலான Bluetooth பிரிண்டர்கள் (Classic + BLE).' : 'Any browser. Works with almost every Bluetooth printer (Classic + BLE).',
      steps: ta
        ? ['Play Store-ல் இலவச "RawBT" ஆப்பை நிறுவவும்.', 'போனின் Bluetooth அமைப்பில் பிரிண்டரை pair செய்யவும் (PIN பொதுவாக 0000 அல்லது 1234).', 'RawBT திறந்து, Settings → Connection method → Bluetooth → உங்கள் பிரிண்டரை தேர்வு செய்யவும். Paper: 58mm.', 'இங்கே "டெஸ்ட் பிரிண்ட்" அழுத்தவும். முதல் முறை "RawBT-ல் திற" என்று கேட்டால் "எப்போதும்" தேர்வு செய்யவும்.']
        : ['Install the free "RawBT" app from the Play Store.', 'Pair the printer in the phone\u2019s Bluetooth settings (PIN is usually 0000 or 1234).', 'Open RawBT → Settings → Connection method: Bluetooth → pick your printer. Paper: 58mm.', 'Press "Test Print" here. If Android asks which app to open, choose RawBT → "Always".'],
      link: { href: RAWBT_PLAY_STORE, text: ta ? 'RawBT-ஐ நிறுவு' : 'Get RawBT' },
    },
    {
      id: 'bluetooth', icon: Bluetooth,
      title: ta ? 'நேரடி Bluetooth (Chrome / Edge)' : 'Direct Bluetooth (Chrome / Edge)',
      desc: ta ? 'ஆப் தேவையில்லை. BLE பிரிண்டர்கள் மட்டும்.' : 'No app needed. BLE printers only.',
      steps: ta
        ? ['Google Chrome அல்லது Edge-ல் திறக்கவும். போனில் Bluetooth, Location ஆன் செய்யவும்.', 'பிரிண்டரை போனில் pair செய்ய வேண்டாம்.', '"பிரிண்டரை இணை" அழுத்தி பட்டியலில் பிரிண்டரை தேர்வு செய்யவும்.', 'பட்டியலில் வரவில்லை என்றால் உங்கள் பிரிண்டர் Classic Bluetooth — Android-ல் RawBT, கணினியில் "PC போர்ட்" பயன்படுத்தவும்.']
        : ['Open in Google Chrome or Edge. On a phone turn on Bluetooth and Location.', 'Do not pair the printer in the phone settings.', 'Press "Connect Printer" and pick the printer from the list.', 'Not in the list? Your printer is Classic Bluetooth — use RawBT on Android, or "PC port" on a computer.'],
    },
    {
      id: 'serial', icon: Monitor,
      title: ta ? 'PC போர்ட் (Windows / Mac)' : 'PC port (Windows / Mac)',
      desc: ta ? 'Bluetooth pair செய்த பிரிண்டர் அல்லது USB கேபிள். Chrome / Edge.' : 'Printer paired over Bluetooth, or the USB cable. Chrome / Edge.',
      steps: ta
        ? ['Windows: Settings → Bluetooth → Add device → பிரிண்டரை pair செய்யவும் (PIN 0000 / 1234). அல்லது USB கேபிள் இணைக்கவும்.', 'Chrome / Edge-ல் இந்த தளத்தை திறக்கவும்.', '"பிரிண்டரை இணை" அழுத்தி COM போர்ட்டை தேர்வு செய்யவும் (எ.கா. "Standard Serial over Bluetooth link").', '"டெஸ்ட் பிரிண்ட்" அழுத்தவும். அச்சாகவில்லை என்றால் மற்ற COM போர்ட்டை முயற்சிக்கவும்.']
        : ['Windows: Settings → Bluetooth → Add device → pair the printer (PIN 0000 / 1234), or plug in the USB cable.', 'Open this site in Chrome or Edge.', 'Press "Connect Printer" and choose the COM port (e.g. "Standard Serial over Bluetooth link").', 'Press "Test Print". Nothing printed? Try the other COM port in the list.'],
    },
    {
      id: 'system', icon: Printer,
      title: ta ? 'சாதன பிரிண்ட் (எல்லா சாதனமும்)' : 'Device print dialog (any device)',
      desc: ta ? 'பிரிண்டர் சாதனத்தில் நிறுவப்பட்டிருந்தால்.' : 'When the printer is installed on the device.',
      steps: ta
        ? ['Windows/Mac: பிரிண்டர் டிரைவரை நிறுவவும். Android: பிரிண்டர் பிரிண்ட் சேவை ஆப்பை நிறுவவும்.', 'அச்சிடும்போது பிரிண்ட் திரையில் பிரிண்டர், Margins: None, Scale 100% தேர்வு செய்யவும்.', 'iPhone/iPad: AirPrint பிரிண்டர் மட்டும். இல்லையெனில் ரசீதை PDF / Share மூலம் பிரிண்டர் ஆப்புக்கு அனுப்பவும்.']
        : ['Windows/Mac: install the printer driver. Android: install a print service app for the printer.', 'When printing, pick the printer, Margins: None, Scale 100%.', 'iPhone/iPad: AirPrint printers only. Otherwise share the receipt PDF to the printer\u2019s own app.'],
    },
  ]
  const current = ROUTES.find((r) => r.id === route)
  const needsConnect = route === 'bluetooth' || route === 'serial'
  const connectedName = route === 'bluetooth' ? (getConnectedPrinterName() || '') : ''

  return (
    <div className="card p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-cream flex items-center gap-2">
          <Printer className="text-brand-gold" size={22} /> {ta ? 'பிரிண்டர் அமைப்பு' : 'Printer setup'}
        </h2>
        <span className="text-xs text-muted">{ta ? 'இந்த சாதனம்' : 'This device'}: <b className="text-cream">{OS_LABEL[device.os]} · {device.browser}</b></span>
      </div>

      <p className="text-muted text-sm">{ta ? 'இந்த சாதனத்தில் எப்படி அச்சிட வேண்டும் என்பதை தேர்வு செய்யவும். ஒவ்வொரு சாதனமும் தனித்தனியாக நினைவில் வைக்கும்.' : 'Choose how this device prints. Each device remembers its own choice.'}</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {ROUTES.map((r) => {
          const Icon = r.icon
          const ok = support[r.id]
          const on = route === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => choose(r.id)}
              disabled={!ok}
              className={`text-left p-4 rounded-xl border-2 transition-all ${on ? 'border-brand-gold bg-brand-gold/10' : 'border-brand-gold/20 hover:border-brand-gold/40'} ${!ok ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={on ? 'text-brand-gold' : 'text-muted'} size={22} />
                <div className="flex-1">
                  <p className="text-cream font-medium text-sm flex items-center gap-2 flex-wrap">
                    {r.title}
                    {r.id === recommended && ok && <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-semibold">{ta ? 'பரிந்துரை' : 'Recommended'}</span>}
                  </p>
                  <p className="text-muted text-xs mt-1">{ok ? r.desc : (ta ? 'இந்த சாதனம்/பிரவுசரில் இல்லை' : 'Not available on this device/browser')}</p>
                </div>
                {on && <CheckCircle2 className="text-brand-gold shrink-0" size={18} />}
              </div>
            </button>
          )
        })}
      </div>

      {current && (
        <div className="rounded-xl border border-brand-gold/20 bg-dark-primary/40 p-4 space-y-3">
          <p className="text-cream font-semibold text-sm">{ta ? 'அமைக்கும் முறை' : 'How to set up'}: {current.title}</p>
          <ol className="list-decimal pl-5 space-y-1 text-sm text-cream/90">
            {current.steps.map((st) => <li key={st}>{st}</li>)}
          </ol>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {current.link && (
              <a href={current.link.href} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold flex items-center gap-2">
                <ExternalLink size={16} /> {current.link.text}
              </a>
            )}
            {needsConnect && (ready ? (
              <span className="px-3 py-2 rounded-lg bg-green-500/15 text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 size={16} /> {ta ? 'இணைக்கப்பட்டது' : 'Connected'}{connectedName ? ` · ${connectedName}` : ''}
              </span>
            ) : (
              <button type="button" onClick={connect} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Bluetooth size={16} />} {ta ? 'பிரிண்டரை இணை' : 'Connect Printer'}
              </button>
            ))}
            {needsConnect && ready && (
              <button type="button" onClick={async () => { await disconnectPrinter(); setReady(false) }} className="px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-sm">{ta ? 'துண்டி' : 'Disconnect'}</button>
            )}
            <button type="button" onClick={test} disabled={busy} className="px-4 py-2 rounded-lg bg-brand-gold text-dark-primary text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <TestTube size={16} />} {ta ? 'டெஸ்ட் பிரிண்ட்' : 'Test Print'}
            </button>
          </div>
          {route === 'bluetooth' && !ready && getSavedPrinterName() && (
            <p className="text-muted text-xs">{ta ? 'கடைசி பிரிண்டர்' : 'Last printer'}: {getSavedPrinterName()}</p>
          )}
        </div>
      )}

      <div>
        <label className="text-muted text-sm mb-2 block">{ta ? 'தாள் அகலம்' : 'Paper width'}</label>
        <div className="flex gap-3">
          {[{ v: 58, d: ta ? '2 அங்குலம் (மினி பிரிண்டர்)' : '2-inch (mini printer)' }, { v: 80, d: ta ? '3 அங்குலம்' : '3-inch' }].map((o) => (
            <button key={o.v} type="button" onClick={() => change('paperWidth', o.v)} className={`flex-1 p-3 rounded-xl border-2 text-center ${config.paperWidth === o.v ? 'border-brand-gold bg-brand-gold/10' : 'border-brand-gold/20 hover:border-brand-gold/40'}`}>
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
        desc={ta ? 'ஆர்டர் வைத்தவுடன் ரசீது அச்சாகும்' : 'Prints the receipt as soon as the order is placed'}
      />

      <div className="flex gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs leading-relaxed">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          {ta
            ? 'SHREYANS PSF-588 போன்ற 2 அங்குல மினி பிரிண்டர்: Android-ல் "RawBT ஆப்", Windows-ல் "PC போர்ட்" சிறந்தது. தாள் 58mm.'
            : 'For 2-inch mini printers like the SHREYANS PSF-588: use "RawBT app" on Android and "PC port" on Windows. Paper 58mm.'}
        </span>
      </div>
    </div>
  )
}
