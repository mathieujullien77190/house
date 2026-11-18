import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/components/App'
import ChezMatou from '@/components/ChezMatou'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* La page invité du réseau (`/chezmatou`) est la même application : elle seule s'affiche, sans la clé de la WebApp. */}
    {window.location.pathname === '/chezmatou' ? <ChezMatou /> : <App />}
  </StrictMode>,
)
