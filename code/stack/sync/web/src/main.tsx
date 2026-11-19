import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { watchRangeFill } from '@house/ui'
import App from '@/components/App'
import './index.css'

watchRangeFill()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
