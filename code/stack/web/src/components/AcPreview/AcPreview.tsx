import { useEffect, useState } from 'react'
import AcUnitCard from '@/components/AcPanel/AcUnitCard'
import { fetchAc, setAc } from '@/lib/api'
import type { AcPatch, AcUnit } from '@/types'
import { LOADING_TEXT, POLL_MS, UNKNOWN_TEXT, WRAP_CLASS, NOTE_CLASS } from './constants'
import type { AcPreviewProps } from './types'

/**
 * L'aperçu d'une climatisation sur la carte (un clic sur son icône) : **le même bloc que dans l'onglet Clim** (nom, On / Off, état, mode, consigne, ventilateur, ailette), relu toutes les 10 s, Après un ordre, la réponse du module s'affiche tout de suite.
 */
const AcPreview = ({ apiKey, unitId }: AcPreviewProps) => {
  const [units, setUnits] = useState<AcUnit[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetchAc(apiKey)
        .then((list) => {
          if (cancelled) return
          setUnits(list)
          setLoaded(true)
        })
        .catch(() => undefined)
    load()
    const timer = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [apiKey])

  const unit = units.find((candidate) => candidate.id === unitId)
  const change = (patch: AcPatch) => {
    setBusy(true)
    setFailed(false)
    setAc(apiKey, unitId, patch)
      .then((next) => setUnits((current) => current.map((candidate) => (candidate.id === unitId ? next : candidate))))
      .catch(() => setFailed(true))
      .finally(() => setBusy(false))
  }

  return (
    <div className={WRAP_CLASS}>
      {unit ? (
        <AcUnitCard unit={unit} busy={busy} failed={failed} onChange={change} />
      ) : (
        <span className={NOTE_CLASS}>{loaded ? UNKNOWN_TEXT : LOADING_TEXT}</span>
      )}
    </div>
  )
}

export default AcPreview
