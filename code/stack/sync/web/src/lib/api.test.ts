import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  fetchClips,
  fetchDocker,
  fetchGuest,
  fetchHue,
  fetchNetwork,
  fetchOverview,
  fetchCameraEnergy,
  fetchLampEnergy,
  fetchMachineEnergy,
  fetchRetention,
  fetchSettings,
  fetchSpecs,
  fetchSystem,
  fetchTable,
  fileUrl,
  isLoginRequired,
  login,
  logout,
  saveGuest,
  saveRetention,
  saveSetting,
} from './api'

const fetchMock = vi.fn()
const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, RequestInit | undefined]

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('erreurs', () => {
  it('ApiError garde son code ; seule une 401 demande la connexion', () => {
    const error = new ApiError(500, 'boum')
    expect(error.status).toBe(500)
    expect(error.message).toBe('boum')
    expect(isLoginRequired(new ApiError(401, 'x'))).toBe(true)
    expect(isLoginRequired(error)).toBe(false)
    expect(isLoginRequired(new Error('x'))).toBe(false)
  })

  it('une lecture refusée : 401 = connexion requise, autre code = message avec l’adresse', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(fetchSettings()).rejects.toMatchObject({ status: 401, message: 'connexion requise' })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    await expect(fetchSettings()).rejects.toMatchObject({ status: 500, message: '/api/settings : HTTP 500' })
  })
})

describe('session', () => {
  it('login envoie la clé en JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await login('ma-cle')
    expect(lastCall()).toEqual(['/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"key":"ma-cle"}' }])
  })

  it('login : clé refusée, ou autre erreur', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(login('x')).rejects.toMatchObject({ status: 401, message: 'clé refusée' })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
    await expect(login('x')).rejects.toMatchObject({ status: 429, message: 'connexion : HTTP 429' })
  })

  it('logout ferme la session', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}'))
    await logout()
    expect(lastCall()).toEqual(['/logout', { method: 'POST' }])
  })
})

describe('lectures', () => {
  it.each([
    ['fetchSettings', fetchSettings, '/api/settings'],
    ['fetchGuest', fetchGuest, '/api/guest'],
    ['fetchDocker', fetchDocker, '/api/docker'],
    ['fetchSpecs', fetchSpecs, '/api/specs'],
    ['fetchHue', fetchHue, '/api/hue'],
    ['fetchNetwork', fetchNetwork, '/api/network'],
    ['fetchSystem', fetchSystem, '/api/system'],
    ['fetchCameraEnergy', fetchCameraEnergy, '/api/camera-energy'],
    ['fetchLampEnergy', fetchLampEnergy, '/api/lamp-energy'],
    ['fetchMachineEnergy', fetchMachineEnergy, '/api/machine-energy'],
  ])('%s lit %s', async (_name, read, path) => {
    answer({ ok: true })
    expect(await read()).toEqual({ ok: true })
    expect(lastCall()[0]).toBe(path)
  })

  it('fetchOverview : complète ou seulement la base', async () => {
    answer({})
    await fetchOverview()
    expect(lastCall()[0]).toBe('/api/overview')
    answer({})
    await fetchOverview(false)
    expect(lastCall()[0]).toBe('/api/overview?part=database')
  })

  it('fetchRetention rend le nombre de jours', async () => {
    answer({ clip_retention_days: 30 })
    expect(await fetchRetention()).toBe(30)
  })

  it('fetchTable : nom encodé, page, taille et filtre', async () => {
    answer({ items: [] })
    await fetchTable('hue events', 2, 20)
    expect(lastCall()[0]).toBe('/api/table?name=hue%20events&page=2&size=20')
    answer({ items: [] })
    await fetchTable('events', 0, 20, { match: 'cam', day: '' })
    expect(lastCall()[0]).toBe('/api/table?name=events&page=0&size=20&match=cam')
  })

  it('fetchClips : sauvegardés ou non, filtre par caméra, caméras rendues en options', async () => {
    answer({ items: [{ id: 'a' }], total: 1, page: 0, size: 20, cameras: ['cam'] })
    const result = await fetchClips(0, 20, true)
    expect(lastCall()[0]).toBe('/api/clips?page=0&size=20&saved=1')
    expect(result).toEqual({ items: [{ id: 'a' }], total: 1, page: 0, size: 20, options: ['cam'] })
    answer({ items: [], total: 0, page: 1, size: 20, cameras: [] })
    await fetchClips(1, 20, false, { match: 'cam', day: '' })
    expect(lastCall()[0]).toBe('/api/clips?page=1&size=20&saved=0&camera=cam')
  })
})

describe('écritures', () => {
  it('saveSetting envoie la caméra et le changement', async () => {
    answer({ camera: 'cam', live_fps: 5 })
    expect(await saveSetting('cam', { live_fps: 5 })).toEqual({ camera: 'cam', live_fps: 5 })
    expect(lastCall()).toEqual(['/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"camera":"cam","live_fps":5}' }])
  })

  it('saveRetention rend les jours enregistrés', async () => {
    answer({ clip_retention_days: 60 })
    expect(await saveRetention(60)).toBe(60)
    expect(lastCall()[1]?.body).toBe('{"clip_retention_days":60}')
  })

  it('saveGuest envoie le changement', async () => {
    answer({ guest_fps: 5, guest_enabled: false, guest_link: null })
    expect(await saveGuest({ guest_enabled: false })).toEqual({ guest_fps: 5, guest_enabled: false, guest_link: null })
    expect(lastCall()[1]?.body).toBe('{"guest_enabled":false}')
  })
})

describe('fileUrl', () => {
  it('sert les fichiers du disque backup', () => {
    expect(fileUrl('clips/cam/a.mp4')).toBe('/files/clips/cam/a.mp4')
  })
})
