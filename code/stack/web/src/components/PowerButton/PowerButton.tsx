import { useState } from 'react'
import { Button } from '@house/ui'
import { setCameraPower } from '@/lib/api'
import { ERROR_TEXT, LABELS, STATUS_CLASS, WRAP_CLASS } from './constants'
import { statusText } from './helpers'
import type { PowerButtonProps } from './types'

/**
 * Allume ou éteint une caméra : House API coupe ou rend le PoE de son port sur le switch. Un clic suffit, dans
 * les deux sens. Sans switch configuré (503), rien ne s'affiche.
 */
const PowerButton = ({ apiKey, camera, power, onPower }: PowerButtonProps) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!power) return null

  const change = async (on: boolean) => {
    setBusy(true)
    setError('')
    try {
      onPower(await setCameraPower(apiKey, camera, on))
    } catch {
      setError(ERROR_TEXT)
    } finally {
      setBusy(false)
    }
  }

  const label = busy ? LABELS.busy : power.on ? LABELS.off : LABELS.on
  return (
    <div className={WRAP_CLASS}>
      <Button variant={power.on ? 'danger' : 'active'} disabled={busy} onClick={() => void change(!power.on)}>
        {label}
      </Button>
      <span className={STATUS_CLASS}>{error || statusText(power)}</span>
    </div>
  )
}

export default PowerButton
