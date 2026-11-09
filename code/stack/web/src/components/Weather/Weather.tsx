import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWeather } from '@/lib/useWeather'
import {
  ARROW_CLASS,
  ARROW_NEXT_LABEL,
  ARROW_PREVIOUS_LABEL,
  BUTTON_CLASS,
  HOUR_CLASS,
  HOUR_ICON_CLASS,
  HOUR_NOW_CLASS,
  HOUR_RAIN_CLASS,
  HOUR_RAINY_CLASS,
  HOUR_TEMPERATURE_CLASS,
  HOUR_TIME_CLASS,
  HOUSE_LATITUDE,
  HOUSE_LONGITUDE,
  HOUSE_PLACE,
  ICON_CLASS,
  PANEL_CLASS,
  PANEL_LABEL,
  PLACE_CLASS,
  RAINY_CHANCE,
  SCROLL_STEP,
  SCROLLER_CLASS,
  TEMPERATURE_CLASS,
  WRAP_CLASS,
} from './constants'
import { describeWeather, hourLabel, rainText } from './helpers'

/**
 * Le temps qu'il fait chez soi, dans la barre du haut : un petit dessin (soleil, nuage, pluie…), la température et le lieu. Lu par le navigateur sur Open-Meteo
 * (`lib/useWeather.ts`) ; rien ne s'affiche tant qu'on ne l'a pas lu. Un clic ouvre, sous la barre, la prévision heure par heure des 24 prochaines heures
 * (l'heure, le dessin, la température, la chance de pluie) ; un clic ailleurs ou Échap la ferme.
 */
const Weather = () => {
  const weather = useWeather(HOUSE_LATITUDE, HOUSE_LONGITUDE)
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  // Les flèches s'éteignent au bout de la liste.
  const [edges, setEdges] = useState({ start: true, end: false })
  const readEdges = useCallback(() => {
    const element = scroller.current
    if (!element) return
    setEdges({ start: element.scrollLeft <= 1, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1 })
  }, [])
  // Les flèches n'existent que si la liste est affichée : la liste est donc là.
  const scrollBy = (direction: 1 | -1) => {
    const list = scroller.current as HTMLDivElement
    list.scrollBy({ left: direction * list.clientWidth * SCROLL_STEP, behavior: 'smooth' })
  }

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

  // À l'ouverture et quand la fenêtre change de taille : où en est la liste.
  useEffect(() => {
    if (!open) return
    readEdges()
    window.addEventListener('resize', readEdges)
    return () => window.removeEventListener('resize', readEdges)
  }, [open, readEdges, weather])

  if (!weather) return null
  const { icon, label } = describeWeather(weather.code, weather.isDay)
  const degrees = Math.round(weather.temperature)
  return (
    <span ref={wrap} className={WRAP_CLASS}>
      <button
        type="button"
        className={BUTTON_CLASS}
        title={`${HOUSE_PLACE} : ${label}, ${degrees} °C. Prévisions heure par heure`}
        aria-label={`${HOUSE_PLACE} : ${label}, ${degrees} degrés. ${PANEL_LABEL}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={ICON_CLASS} aria-hidden="true">
          {icon}
        </span>
        <span className={TEMPERATURE_CLASS} aria-hidden="true">
          {degrees}°
        </span>
        <span className={PLACE_CLASS} aria-hidden="true">
          {HOUSE_PLACE}
        </span>
      </button>
      {open && weather.hours.length > 0 ? (
        <div className={PANEL_CLASS} role="region" aria-label={PANEL_LABEL}>
          <button
            type="button"
            className={ARROW_CLASS}
            aria-label={ARROW_PREVIOUS_LABEL}
            disabled={edges.start}
            onClick={() => scrollBy(-1)}
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <div ref={scroller} className={SCROLLER_CLASS} onScroll={readEdges}>
            {weather.hours.map((hour, index) => {
              const described = describeWeather(hour.code, hour.isDay)
              return (
                <div
                  key={hour.time}
                  className={`${HOUR_CLASS} ${index === 0 ? HOUR_NOW_CLASS : ''}`}
                  title={`${hourLabel(hour.time)} : ${described.label}`}
                >
                  <span className={HOUR_TIME_CLASS}>{index === 0 ? 'Maintenant' : hourLabel(hour.time)}</span>
                  <span className={HOUR_ICON_CLASS} aria-hidden="true">
                    {described.icon}
                  </span>
                  <span className={HOUR_TEMPERATURE_CLASS}>{Math.round(hour.temperature)}°</span>
                  <span className={hour.rainChance >= RAINY_CHANCE ? HOUR_RAINY_CLASS : HOUR_RAIN_CLASS}>{rainText(hour.rainChance)}</span>
                </div>
              )
            })}
          </div>
          <button type="button" className={ARROW_CLASS} aria-label={ARROW_NEXT_LABEL} disabled={edges.end} onClick={() => scrollBy(1)}>
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </span>
  )
}

export default Weather
