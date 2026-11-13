import { act, renderHook } from '@testing-library/react'
import { flush, reply, stubFetch } from '@/test/fetch'
import { FORECAST_HOURS, parseHours, useWeather, WEATHER_REFRESH_MS, weatherUrl } from './useWeather'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}

const BODY = {
  current: { temperature_2m: 9.4, weather_code: 61, is_day: 1, wind_speed_10m: 18.2 },
  hourly: {
    time: ['2026-11-10T14:00', '2026-11-10T15:00'],
    temperature_2m: [9.4, 10],
    weather_code: [61, 3],
    is_day: [1, 0],
    precipitation_probability: [70, 5],
    precipitation: [0.4, 0],
    wind_speed_10m: [12.6, 30],
  },
}

describe('weatherUrl', () => {
  it('demande le temps actuel et les prochaines heures', () => {
    const url = weatherUrl(48.52, 2.64)
    expect(url).toContain('latitude=48.52&longitude=2.64')
    expect(url).toContain('current=temperature_2m,weather_code,is_day,wind_speed_10m')
    expect(url).toContain('hourly=temperature_2m,weather_code,is_day,precipitation_probability,precipitation,wind_speed_10m')
    expect(url).toContain('wind_speed_unit=kmh')
    expect(url).toContain(`forecast_hours=${FORECAST_HOURS}`)
  })
})

describe('parseHours', () => {
  it('range les tableaux parallèles heure par heure', () => {
    expect(parseHours(BODY.hourly)).toEqual([
      { time: '2026-11-10T14:00', temperature: 9.4, code: 61, isDay: true, rainChance: 70, rain: 0.4, wind: 12.6 },
      { time: '2026-11-10T15:00', temperature: 10, code: 3, isDay: false, rainChance: 5, rain: 0, wind: 30 },
    ])
  })
  it('sans prévision, ou avec des tableaux absents : rien', () => {
    expect(parseHours(undefined)).toEqual([])
    expect(parseHours({ time: ['2026-11-10T14:00'] })).toEqual([])
    expect(parseHours({ time: 'x' })).toEqual([])
  })
  it('une heure incomplète est laissée de côté, une probabilité ou un cumul absents valent zéro', () => {
    const hours = parseHours({
      time: ['2026-11-10T14:00', 3, '2026-11-10T16:00', '2026-11-10T17:00'],
      temperature_2m: [9, 9, 'x', 8],
      weather_code: [1, 1, 1, 2],
      is_day: [1, 1, 1, 1],
      precipitation_probability: [null, 1, 1, 'x'],
      precipitation: [null, 1, 1, 'x'],
      wind_speed_10m: [null, 1, 1, 'x'],
    })
    expect(hours).toEqual([
      { time: '2026-11-10T14:00', temperature: 9, code: 1, isDay: true, rainChance: 0, rain: 0, wind: 0 },
      { time: '2026-11-10T17:00', temperature: 8, code: 2, isDay: true, rainChance: 0, rain: 0, wind: 0 },
    ])
  })
})

describe('useWeather', () => {
  it('rien tant que la météo n’est pas lue, puis le temps et les heures', async () => {
    stubFetch(() => reply(BODY))
    const { result } = renderHook(() => useWeather(48.52, 2.64))
    expect(result.current).toBeNull()
    await settle()
    expect(result.current).toMatchObject({ temperature: 9.4, wind: 18.2, code: 61, isDay: true })
    expect(result.current?.hours).toHaveLength(2)
  })

  it('sans vent dans la réponse, le vent vaut zéro', async () => {
    stubFetch(() => reply({ ...BODY, current: { temperature_2m: 9.4, weather_code: 61, is_day: 1 } }))
    const { result } = renderHook(() => useWeather(1, 2))
    await settle()
    expect(result.current?.wind).toBe(0)
  })

  it('une nuit : is_day à zéro', async () => {
    stubFetch(() => reply({ ...BODY, current: { ...BODY.current, is_day: 0 } }))
    const { result } = renderHook(() => useWeather(1, 2))
    await settle()
    expect(result.current?.isDay).toBe(false)
  })

  it('une réponse en erreur ou incomplète ne montre rien', async () => {
    stubFetch(() => reply({}, 500))
    const first = renderHook(() => useWeather(1, 2))
    await settle()
    expect(first.result.current).toBeNull()
    stubFetch(() => reply({ current: { temperature_2m: 'x' } }))
    const second = renderHook(() => useWeather(1, 2))
    await settle()
    expect(second.result.current).toBeNull()
    stubFetch(() => reply({ current: { temperature_2m: 5 } }))
    const third = renderHook(() => useWeather(1, 2))
    await settle()
    expect(third.result.current).toBeNull()
    stubFetch(() => reply({}))
    const fourth = renderHook(() => useWeather(1, 2))
    await settle()
    expect(fourth.result.current).toBeNull()
  })

  it('se relit à son rythme, garde la dernière valeur si la relecture échoue, et s’arrête au démontage', async () => {
    const spy = stubFetch(() => reply(BODY))
    const { result, unmount } = renderHook(() => useWeather(1, 2))
    await settle()
    spy.mockImplementation(() => Promise.reject(new Error('réseau')))
    await settle(WEATHER_REFRESH_MS)
    expect(spy).toHaveBeenCalledTimes(2)
    expect(result.current?.temperature).toBe(9.4)
    unmount()
    await settle(WEATHER_REFRESH_MS)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('une réponse qui arrive après le démontage est ignorée', async () => {
    let answer: (response: Response) => void = () => undefined
    const spy = vi.fn(() => new Promise<Response>((resolve) => (answer = resolve)))
    vi.stubGlobal('fetch', spy)
    const { result, unmount } = renderHook(() => useWeather(1, 2))
    unmount()
    answer(reply(BODY))
    await settle()
    expect(result.current).toBeNull()
  })
})
