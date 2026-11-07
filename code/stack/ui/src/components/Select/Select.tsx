import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  CHECK,
  CHECK_CLASS,
  CHEVRON,
  CHEVRON_CLASS,
  CHEVRON_OPEN_CLASS,
  LIST_CLASS,
  OPTION_ACTIVE_CLASS,
  OPTION_CLASS,
  OPTION_SELECTED_CLASS,
  PLACEHOLDER_CLASS,
  TRIGGER_CLASS,
  TRIGGER_OPEN_CLASS,
  VALUE_CLASS,
  WRAP_CLASS,
} from './constants'
import type { SelectProps } from './types'

/**
 * Une liste déroulante à la place du `<select>` natif : un bouton qui montre le choix, une liste qui s'ouvre dessous (clic, Entrée, flèches),
 * Échap ou un clic ailleurs la ferme. Aucune donnée : le choix reste au parent.
 */
const Select = ({ label, options, value, onChange, placeholder = '' }: SelectProps) => {
  const [open, setOpen] = useState(false)
  // L'option surlignée au clavier ou à la souris.
  const [active, setActive] = useState(0)
  const wrap = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.findIndex((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const show = () => {
    setActive(Math.max(selected, 0))
    setOpen(true)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') return setOpen(false)
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return
    event.preventDefault()
    if (!open) return show()
    if (event.key === 'Enter' || event.key === ' ') return choose(active)
    if (event.key === 'Home') return setActive(0)
    if (event.key === 'End') return setActive(options.length - 1)
    setActive((current) => Math.min(options.length - 1, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1))))
  }

  const current = options[selected]
  return (
    <div ref={wrap} className={WRAP_CLASS}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        className={`${TRIGGER_CLASS} ${open ? TRIGGER_OPEN_CLASS : ''}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span className={current ? VALUE_CLASS : PLACEHOLDER_CLASS}>{current ? current.label : placeholder}</span>
        <span aria-hidden="true" className={`${CHEVRON_CLASS} ${open ? CHEVRON_OPEN_CLASS : ''}`}>
          {CHEVRON}
        </span>
      </button>
      {open ? (
        <ul id={listId} role="listbox" aria-label={label} className={LIST_CLASS}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={index === selected}
              className={`${OPTION_CLASS} ${index === active ? OPTION_ACTIVE_CLASS : ''} ${index === selected ? OPTION_SELECTED_CLASS : ''}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>{option.label}</span>
              {index === selected ? <span className={CHECK_CLASS}>{CHECK}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default Select
