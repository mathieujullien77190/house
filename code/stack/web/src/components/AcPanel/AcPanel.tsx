import { useEffect, useState } from 'react'
import { Notice, SectionTitle } from '@house/ui'
import { ApiError, fetchAc, setAc } from '@/lib/api'
import type { AcPatch, AcUnit } from '@/types'
import AcUnitCard from './AcUnitCard'
import { BOX_CLASS, LIST_CLASS, LOADING_TEXT, NOT_CONFIGURED_TEXT, POLL_MS, TITLE, UNAVAILABLE_TEXT } from './constants'
import type { AcPanelProps } from './types'

/** L'onglet Clim : un bloc par climatisation Mitsubishi, avec Allumer / Éteindre, le mode, la consigne (− / +) et le ventilateur. */
const AcPanel = ({ apiKey }: AcPanelProps) => {
  const [units, setUnits] = useState<AcUnit[] | null>(null)
  // 'loading' avant la première réponse, 'none' : aucune unité configurée (503), 'off' : l'API ne répond pas.
  const [problem, setProblem] = useState<'loading' | 'none' | 'off' | null>('loading')
  // L'unité dont un ordre est en route, et celle dont le dernier ordre a échoué.
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchAc(apiKey)
        .then((next) => {
          if (cancelled) return
          setUnits(next)
          setProblem(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setUnits(null)
          setProblem(error instanceof ApiError && error.status === 503 ? 'none' : 'off')
        })
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  // Un changement (alimentation, mode, consigne ou ventilateur) : l'API rend l'unité avec le changement appliqué.
  const change = (id: string, patch: AcPatch) => {
    setBusy(id)
    setFailed(null)
    setAc(apiKey, id, patch)
      .then((unit) => setUnits((current) => (current ? current.map((candidate) => (candidate.id === id ? unit : candidate)) : current)))
      .catch(() => setFailed(id))
      .finally(() => setBusy(null))
  }

  return (
    <section className={BOX_CLASS}>
      <SectionTitle text={TITLE} />
      {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
      {problem === 'none' ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
      {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
      {units ? (
        <div className={LIST_CLASS}>
          {units.map((unit) => (
            <AcUnitCard key={unit.id} unit={unit} busy={busy === unit.id} failed={failed === unit.id} onChange={(patch) => change(unit.id, patch)} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default AcPanel
