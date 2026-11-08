import { useEffect, useState } from 'react'
import { HeatingPanel, type HeatingField } from '@house/ui'
import { ApiError, fetchHeating, saveHeating } from '@/lib/api'
import type { HeatingStatus } from '@/types'
import {
  COOLDOWN_HINT,
  ENABLED_LABEL,
  FIELD_LABELS,
  INVALID_TEXT,
  SAVE_ERROR_TEXT,
  SAVE_LABEL,
} from './constants'
import { toBody, toForm } from './helpers'
import type { HeatingForm, HeatingSectionProps } from './types'

/** Le chauffage automatique de la prise : les réglages de la règle, et ce qu'elle ferait maintenant. Relu à l'ouverture et après chaque commande de la prise (`version`). */
const HeatingSection = ({ apiKey, version }: HeatingSectionProps) => {
  const [status, setStatus] = useState<HeatingStatus | null>(null)
  // Ce que la personne tape : rempli à la première lecture seulement.
  const [draft, setDraft] = useState<{ form: HeatingForm; enabled: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchHeating(apiKey)
      .then((heating) => {
        if (!alive) return
        setStatus(heating)
        // Une relecture ne défait pas ce qu'on est en train de taper.
        setDraft((current) => current ?? { form: toForm(heating), enabled: heating.enabled })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [apiKey, version])

  // Sans réglages (pas de pont Hue, ou rien lu encore) : rien à montrer.
  if (!status || !draft) return null
  const { form, enabled } = draft

  const change = (key: keyof HeatingForm) => (value: string) => setDraft({ ...draft, form: { ...form, [key]: value } })
  const field = (key: keyof HeatingForm, kind: HeatingField['kind'], hint?: string): HeatingField => ({
    id: key,
    label: FIELD_LABELS[key],
    value: form[key],
    kind,
    hint,
    onChange: change(key),
  })

  const save = () => {
    const body = toBody(form, enabled)
    if (!body) return setError(INVALID_TEXT)
    setSaving(true)
    setError(null)
    saveHeating(apiKey, body)
      .then((next) => {
        setStatus(next)
        setDraft({ form: toForm(next), enabled: next.enabled })
      })
      .catch((failure: unknown) => setError(failure instanceof ApiError ? failure.message : SAVE_ERROR_TEXT))
      .finally(() => setSaving(false))
  }

  return (
    <HeatingPanel
      enabledLabel={ENABLED_LABEL}
      enabled={enabled}
      onEnabledChange={(value) => setDraft({ ...draft, enabled: value })}
      fields={[
        field('threshold', 'decimal'),
        field('minutes', 'number'),
        field('cooldown', 'number', COOLDOWN_HINT),
      ]}
      saveLabel={SAVE_LABEL}
      saving={saving}
      onSave={save}
      error={error}
    />
  )
}

export default HeatingSection
