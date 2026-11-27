import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Scrolling the mouse over a focused number box must not change the value
// (e.g. a price or cost). Blur the box so the page scrolls instead.
document.addEventListener('wheel', (e) => {
  const el = document.activeElement
  if (el && el.type === 'number' && el === e.target) el.blur()
}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
