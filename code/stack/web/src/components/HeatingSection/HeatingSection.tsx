import { useEffect, useState } from 'react'
import { HeatingPanel, type HeatingField } from '@house/ui'
import { ApiError, fetchHeating, fetchHeatingLog, saveHeating } from '@/lib/api'
import type { HeatingLogEntry, HeatingStatus } from '@/types'
import {
  COLUMNS,
  COOLDOWN_HINT,
  EMPTY_TEXT,
  ENABLED_LABEL,
  FIELD_LABELS,
  INVALID_TEXT,
  LOG_TITLE,
  SAVE_ERROR_TEXT,
  SAVE_LABEL,
  TITLE,
  TOTAL_LABEL,
  UNKNOWN_HOURS_NOTE,
  WATTS_HINT,
} from './constants'
import { euros, rowOf, statusText, toBody, toForm, totalCost } from './helpers'
import type { HeatingForm, HeatingSectionProps } from './types'

/** Le chauffage automatique de la prise : les réglages de la règle, ce qu'elle ferait maintenant et le journal des 50 dernières activations. Relu à l'ouverture et après chaque commande de la prise (`version`). */
const HeatingSection = ({ apiKey, version }: HeatingSectionProps) => {
  const [status, setStatus] = useState<HeatingStatus | null>(null)
  const [log, setLog] = useState<HeatingLogEntry[]>([])
  // Ce que la personne tape : rempli à la première lecture seulement.
  const [draft, setDraft] = useState<{ form: HeatingForm; enabled: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([fetchHeating(apiKey), fetchHeatingLog(apiKey, 50)])
      .then(([heating, entries]) => {
        if (!alive) return
        setStatus(heating)
        setLog(entries)
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

  const total = totalCost(log)
  return (
    <HeatingPanel
      title={TITLE}
      enabledLabel={ENABLED_LABEL}
      enabled={enabled}
      onEnabledChange={(value) => setDraft({ ...draft, enabled: value })}
      fields={[
        field('threshold', 'decimal'),
        field('minutes', 'number'),
        field('cooldown', 'number', COOLDOWN_HINT),
        field('price', 'decimal'),
        field('peakPrice', 'decimal'),
        field('offPeakStart', 'time'),
        field('offPeakEnd', 'time'),
        field('watts', 'number', WATTS_HINT),
      ]}
      saveLabel={SAVE_LABEL}
      saving={saving}
      onSave={save}
      error={error}
      status={statusText(status)}
      note={status.offPeakStart === null || status.offPeakEnd === null ? UNKNOWN_HOURS_NOTE : null}
      logTitle={LOG_TITLE}
      columns={COLUMNS}
      rows={log.map(rowOf)}
      emptyText={EMPTY_TEXT}
      total={total === null ? null : { label: TOTAL_LABEL, value: euros(total) }}
    />
  )
}

export default HeatingSection
