import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AcPatch, AcReading, MitsubishiClient } from '../lib/mitsubishiClient.ts'
import { createAcService, UnknownAcUnit } from './acService.ts'

const READING: AcReading = { power: true, mode: 'heat', targetTemp: 20, roomTemp: 19, fan: 'auto', vane: '2', wideVane: 'center', rssi: -40 }

const setup = () => {
  const state = { reads: 0, applied: [] as string[], down: new Set<string>(), time: 0 }
  const client: MitsubishiClient = {
    read: async (host) => {
      state.reads += 1
      if (state.down.has(host)) throw new Error('hors ligne')
      return READING
    },
    apply: async (host, patch: AcPatch) => {
      state.applied.push(`${host} ${JSON.stringify(patch)}`)
    },
  }
  const units = [
    { id: 'salon', name: 'Salon', host: '1.1.1.1' },
    { id: 'chambre', name: 'Chambre', host: '2.2.2.2' },
  ]
  return { state, service: createAcService({ units, client, now: () => state.time }) }
}

test('l’état : une unité qui ne répond pas est rendue vide, gardé 3 secondes', async () => {
  const { state, service } = setup()
  state.down.add('2.2.2.2')
  const [salon, chambre] = await service.state()
  assert.deepEqual(salon, { id: 'salon', name: 'Salon', reachable: true, ...READING })
  assert.equal(chambre.reachable, false)
  assert.equal(chambre.power, false)
  assert.equal(chambre.targetTemp, null)
  await service.state()
  assert.equal(state.reads, 2)
  state.time = 3000
  await service.state()
  assert.equal(state.reads, 4)
})

test('un changement : envoyé au module, rendu appliqué sur l’état d’avant', async () => {
  const { state, service } = setup()
  const full = await service.update('salon', { power: false, mode: 'cool', temperature: 24, fan: '3', vane: 'swing', wideVane: 'left' })
  assert.deepEqual(state.applied, ['1.1.1.1 {"power":false,"mode":"cool","temperature":24,"fan":"3","vane":"swing","wideVane":"left"}'])
  assert.deepEqual(full, { id: 'salon', name: 'Salon', reachable: true, power: false, mode: 'cool', targetTemp: 24, roomTemp: 19, fan: '3', vane: 'swing', wideVane: 'left', rssi: -40 })
  // la lecture qui suit rend cet état sans interroger le module
  const reads = state.reads
  assert.equal((await service.state())[0].mode, 'cool')
  assert.equal(state.reads, reads + 1)
  const none = await service.update('chambre', {})
  assert.equal(none.targetTemp, 20)
  await assert.rejects(service.update('cave', {}), UnknownAcUnit)
})
