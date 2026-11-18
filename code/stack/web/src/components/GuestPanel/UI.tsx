import { QRCodeSVG } from 'qrcode.react'
import { Button, Notice, SectionTitle } from '@house/ui'
import {
  ADDRESS_CLASS,
  ADDRESS_ROW_CLASS,
  COPIED_LABEL,
  COPY_LABEL,
  FAILED_LABEL,
  FUNCTIONS,
  HINT_CLASS,
  LOADING_TEXT,
  NOT_CONFIGURED_TEXT,
  NOTE_CLASS,
  OFF_TEXT,
  ON_TEXT,
  PANEL_CLASS,
  PREVIEW_CLASS,
  PREVIEW_LABEL,
  PREVIEW_TITLE,
  QR_BOX_CLASS,
  QR_HINT,
  QR_LABEL,
  QR_MARGIN,
  QR_SIZE,
  STATE_CLASS,
  STATE_ROW_CLASS,
  STATE_TITLE,
  SWITCHES_NOTE,
  TITLE,
  UNAVAILABLE_TEXT,
} from './constants'
import type { GuestPanelUIProps } from './types'

const GuestPanelUI = ({ link, problem, previewUrl, copy, onCopy }: GuestPanelUIProps) => (
  <section className={PANEL_CLASS}>
    <SectionTitle text={TITLE} />
    {problem === 'loading' ? <Notice text={LOADING_TEXT} /> : null}
    {problem === 'off' ? <Notice text={UNAVAILABLE_TEXT} /> : null}
    {link && !link.configured ? <Notice text={NOT_CONFIGURED_TEXT} /> : null}
    {link?.url ? (
      <>
        {/* Modules noirs sur fond blanc, avec marge : lisible en clair comme en sombre. */}
        <div className={QR_BOX_CLASS}>
          <QRCodeSVG value={link.url} size={QR_SIZE} level="M" marginSize={QR_MARGIN} bgColor="#ffffff" fgColor="#000000" title={QR_LABEL} />
        </div>
        <span className={HINT_CLASS}>{QR_HINT}</span>
        <div className={ADDRESS_ROW_CLASS}>
          <a className={ADDRESS_CLASS} href={link.url} target="_blank" rel="noopener noreferrer">
            {link.url}
          </a>
          <Button onClick={() => onCopy(String(link.url))}>{copy === 'copied' ? COPIED_LABEL : copy === 'failed' ? FAILED_LABEL : COPY_LABEL}</Button>
        </div>
      </>
    ) : null}
    {link ? (
      <div className={STATE_CLASS}>
        <SectionTitle text={STATE_TITLE} />
        {FUNCTIONS.map(({ key, label }) => (
          <div key={key} className={STATE_ROW_CLASS}>
            <span>{label}</span>
            <span>{link[key] ? ON_TEXT : OFF_TEXT}</span>
          </div>
        ))}
        <span className={NOTE_CLASS}>{SWITCHES_NOTE}</span>
      </div>
    ) : null}
    {previewUrl ? (
      <>
        <SectionTitle text={PREVIEW_TITLE} />
        {/* Chargement différé : l'onglet n'est monté que quand il est ouvert, et le cadre ne se charge qu'en approchant de l'écran. */}
        <iframe className={PREVIEW_CLASS} src={previewUrl} title={PREVIEW_LABEL} loading="lazy" referrerPolicy="no-referrer" />
      </>
    ) : null}
  </section>
)

export default GuestPanelUI
