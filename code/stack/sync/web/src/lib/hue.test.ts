import { describe, expect, it } from 'vitest'
import { bridgeSummary, buildBridgeItems } from './hue'
import { bridge } from './fixtures'

describe('pont Hue', () => {
  it('résume son état', () => {
    expect(bridgeSummary(bridge())).toBe('joignable')
    expect(bridgeSummary(bridge({ reachable: false }))).toBe('injoignable')
  })

  it('liste son état, son adresse et ce qu’il a donné', () => {
    expect(buildBridgeItems(bridge()).map((item) => item.id)).toEqual(['state', 'address', 'name', 'model', 'api', 'software'])
    const down = buildBridgeItems(bridge({ reachable: false, name: null, model: null, apiVersion: null, softwareVersion: null }))
    expect(down).toEqual([
      { id: 'state', label: 'État', value: 'Injoignable' },
      { id: 'address', label: 'Adresse', value: '192.168.1.81' },
    ])
  })
})
