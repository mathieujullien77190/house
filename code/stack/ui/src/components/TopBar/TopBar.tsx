import { useEffect, useRef, useState } from 'react'
import Tabs from '../Tabs'
import {
  BAR_CLASS,
  BURGER_CLASS,
  BURGER_LABEL,
  BURGER_LINE_BOTTOM_OPEN_CLASS,
  BURGER_LINE_CLASS,
  BURGER_LINE_MIDDLE_OPEN_CLASS,
  BURGER_LINE_TOP_OPEN_CLASS,
  DESKTOP_ACTIONS_CLASS,
  DESKTOP_TABS_CLASS,
  ERROR_CLASS,
  INFO_CLASS,
  ITEM_ACTIVE_CLASS,
  ITEM_CLASS,
  ITEM_IDLE_CLASS,
  MOBILE_ERROR_CLASS,
  PANEL_ACTIONS_CLASS,
  PANEL_CLASS,
  PANEL_ERROR_CLASS,
  PANEL_STATUS_CLASS,
  ROW_CLASS,
  SPACER_CLASS,
  STATUS_CLASS,
  TITLE_BUTTON_CLASS,
  TITLE_CLASS,
} from './constants'
import type { TopBarProps } from './types'

/**
 * La barre du haut d'une page, toujours visible : le titre, les onglets, l'état et les boutons dès 1024 px ; en dessous, le titre et un bouton
 * « sandwich » en haut à droite qui ouvre un menu (les pages, l'état, les boutons). Le menu se ferme au choix d'une page, d'un clic ailleurs ou d'Échap.
 */
const TopBar = <T extends string>({ title, onTitle, status = '', tone = 'muted', tabs, info, actions }: TopBarProps<T>) => {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLElement>(null)
  const hasMenu = tabs !== undefined || actions !== undefined

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <header ref={wrap} className={BAR_CLASS}>
      <div className={ROW_CLASS}>
        <h1 className={TITLE_CLASS}>
          {onTitle ? (
            <button type="button" className={TITLE_BUTTON_CLASS} onClick={onTitle}>
              {title}
            </button>
          ) : (
            title
          )}
        </h1>
        {tabs ? (
          <div className={DESKTOP_TABS_CLASS}>
            <Tabs label={tabs.label} options={tabs.options} value={tabs.value} onChange={tabs.onChange} />
          </div>
        ) : null}
        {status ? <p className={tone === 'error' ? ERROR_CLASS : STATUS_CLASS}>{status}</p> : <span className={SPACER_CLASS} />}
        {info ? <div className={INFO_CLASS}>{info}</div> : null}
        {actions ? <div className={DESKTOP_ACTIONS_CLASS}>{actions}</div> : null}
        {hasMenu ? (
          <button type="button" className={BURGER_CLASS} aria-label={BURGER_LABEL} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            <span className={`${BURGER_LINE_CLASS} ${open ? BURGER_LINE_TOP_OPEN_CLASS : ''}`} />
            <span className={`${BURGER_LINE_CLASS} ${open ? BURGER_LINE_MIDDLE_OPEN_CLASS : ''}`} />
            <span className={`${BURGER_LINE_CLASS} ${open ? BURGER_LINE_BOTTOM_OPEN_CLASS : ''}`} />
          </button>
        ) : null}
      </div>
      {status && tone === 'error' ? <p className={MOBILE_ERROR_CLASS}>{status}</p> : null}
      {open && hasMenu ? (
        <nav className={PANEL_CLASS} aria-label={tabs?.label ?? BURGER_LABEL}>
          {tabs?.options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-current={option.id === tabs.value ? 'page' : undefined}
              className={`${ITEM_CLASS} ${option.id === tabs.value ? ITEM_ACTIVE_CLASS : ITEM_IDLE_CLASS}`}
              onClick={() => {
                tabs.onChange(option.id)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
          {status && tone !== 'error' ? <p className={PANEL_STATUS_CLASS}>{status}</p> : null}
          {status && tone === 'error' ? <p className={PANEL_ERROR_CLASS}>{status}</p> : null}
          {actions ? (
            <div className={PANEL_ACTIONS_CLASS} onClick={() => setOpen(false)}>
              {actions}
            </div>
          ) : null}
        </nav>
      ) : null}
    </header>
  )
}

export default TopBar
