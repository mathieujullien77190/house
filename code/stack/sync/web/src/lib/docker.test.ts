import { describe, expect, it } from 'vitest'
import { buildContainerItems, buildDiskItems, buildEngineItems, buildEnvItems, buildImageItems, buildNetworkItems, containerDetail, formatRunning } from './docker'
import { container, dockerGlobal } from './fixtures'

const NOW = Date.parse('2026-11-08T12:05:00Z')

describe('formatRunning et containerDetail', () => {
  it('la durée d’un conteneur en marche, vide s’il est arrêté ou sans date', () => {
    expect(formatRunning(container(), NOW)).toBe('2 h 5 min')
    expect(formatRunning(container({ state: 'exited' }), NOW)).toBe('')
    expect(formatRunning(container({ startedAt: 'pas une date' }), NOW)).toBe('')
    expect(formatRunning(container({ startedAt: '2027-01-01T00:00:00Z' }), NOW)).toBe('0 min')
  })

  it('formatRunning prend l’heure actuelle par défaut', () => {
    expect(formatRunning(container({ startedAt: new Date().toISOString() }))).toBe('0 min')
  })

  it('le résumé du titre', () => {
    expect(containerDetail(container({ startedAt: 'x' }))).toBe('sync · running')
  })
})

describe('buildContainerItems', () => {
  it('toutes les lignes d’un conteneur complet', () => {
    const items = buildContainerItems(container())
    expect(items.map((item) => item.id)).toEqual(['image', 'command', 'state', 'resources', 'layer', 'ports', 'networks', 'mounts', 'env', 'processes'])
    expect(items.find((item) => item.id === 'state')?.value).toBe('running · redémarrage : unless-stopped')
    expect(items.find((item) => item.id === 'resources')?.value).toBe('CPU 1.5% · RAM 80MiB (0.5%) · réseau 1kB / 2kB · disque 0B / 0B')
    expect(items.find((item) => item.id === 'mounts')?.value).toBe('/data → /data (lecture et écriture)\n/house → /house (lecture seule)')
    expect(items.find((item) => item.id === 'processes')?.value).toBe('1 · node · CPU 1.0 % · RAM 0.5 % · node')
  })

  it('un conteneur arrêté dit son code, sans ressources ni politique', () => {
    const items = buildContainerItems(container({ state: 'exited', exitCode: 137, cpu: '', restartPolicy: '', ports: [], layerSize: '' }))
    expect(items.find((item) => item.id === 'state')?.value).toBe('exited · code 137')
    expect(items.some((item) => item.id === 'resources' || item.id === 'ports' || item.id === 'layer')).toBe(false)
  })
})

describe('moteur Docker', () => {
  it('le moteur, ligne par ligne', () => {
    const items = buildEngineItems(dockerGlobal())
    expect(items.map((item) => item.id)).toEqual(['version', 'os', 'storage', 'drivers', 'resources', 'containers', 'images'])
    expect(items.find((item) => item.id === 'containers')?.value).toBe('6 dont 5 en marche, 1 arrêtés, 0 en pause')
    expect(items.find((item) => item.id === 'resources')?.value).toBe('12 threads · 16.0 Go')
  })

  it('les lignes sans valeur disparaissent', () => {
    const empty = dockerGlobal({ version: null, storageDriver: null, loggingDriver: null, cgroupDriver: null, rootDir: null, os: null, kernel: null, cpus: null, memory: null, containers: null, running: null, paused: null, stopped: null, images: null })
    expect(buildEngineItems(empty)).toEqual([])
    const partial = buildEngineItems(dockerGlobal({ containers: 2, running: null, stopped: null, paused: null, os: 'Linux', kernel: null }))
    expect(partial.find((item) => item.id === 'containers')?.value).toBe('2 dont 0 en marche, 0 arrêtés, 0 en pause')
    expect(partial.find((item) => item.id === 'os')?.value).toBe('Linux')
  })
})

describe('listes de la configuration globale', () => {
  const global = dockerGlobal()

  it('les images, avec ou sans étiquette', () => {
    expect(buildImageItems(global)).toEqual([
      { id: 'image-0', label: 'house-sync:latest', value: '200MB · 2 days ago' },
      { id: 'image-1', label: 'alpine', value: '' },
      { id: 'image-2', label: 'node', value: '1GB' },
    ])
  })

  it('les réseaux', () => {
    expect(buildNetworkItems(global).map((item) => item.value)).toEqual(['bridge · 172.18.0.0/16 · conteneurs : sync, api', 'bridge · aucun conteneur'])
  })

  it('l’espace utilisé', () => {
    expect(buildDiskItems(global)).toEqual([{ id: 'df-Images', label: 'Images', value: '2GB · 8 (6 actifs) · récupérable 500MB' }])
  })

  it('le .env : valeur, masquée ou vide', () => {
    expect(buildEnvItems(global).map((item) => item.value)).toEqual(['/data', '•••••••• (masquée)', '(vide)'])
  })
})
