import { describe, expect, it } from 'vitest'
import { buildLinkItems, formatSpeed, linkState, linkSummary } from './network'
import { link } from './fixtures'

describe('formatSpeed', () => {
  it('dit Mb/s ou Gb/s', () => {
    expect(formatSpeed(300)).toBe('300 Mb/s')
    expect(formatSpeed(1000)).toBe('1 Gb/s')
  })
})

describe('linkState', () => {
  it('câble : débranché ou connecté avec débit et duplex', () => {
    expect(linkState(link({ connected: false }))).toBe('Câble débranché')
    expect(linkState(link())).toBe('Connecté · 1 Gb/s · full duplex')
    expect(linkState(link({ speedMbps: null, duplex: null }))).toBe('Connecté')
  })

  it('WiFi : éteint, non connecté, ou connecté avec débit et signal', () => {
    const wifi = { kind: 'wifi' as const, name: 'wlan0' }
    expect(linkState(link({ ...wifi, up: false, connected: null }))).toBe('Éteint')
    expect(linkState(link({ ...wifi, up: false, connected: false }))).toBe('Non connecté')
    expect(linkState(link({ ...wifi, speedMbps: 300, signalDbm: -55, duplex: null }))).toBe('Connecté · 300 Mb/s · -55 dBm')
    expect(linkState(link({ ...wifi, speedMbps: null, signalDbm: null }))).toBe('Connecté')
  })
})

describe('liste et résumé', () => {
  const links = [link(), link({ name: 'wlan0', kind: 'wifi', up: false, connected: false, mac: '' })]

  it('une ligne par carte avec son trafic', () => {
    expect(buildLinkItems(links)).toEqual([
      { id: 'eth0', label: 'RJ45 (eth0)', value: 'Connecté · 1 Gb/s · full duplex · aa:bb · ↓ 2.0 Ko · ↑ 1.0 Ko' },
      { id: 'wlan0', label: 'WiFi (wlan0)', value: 'Non connecté · ↓ 2.0 Ko · ↑ 1.0 Ko' },
    ])
  })

  it('le résumé tient en quelques mots', () => {
    expect(linkSummary(links)).toBe('RJ45 connecté · WiFi non connecté')
  })
})
