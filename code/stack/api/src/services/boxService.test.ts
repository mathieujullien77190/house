import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { FreeboxClient } from '../lib/freebox.ts'
import { createBoxService, EXCLUDE_COMMENT, WhitelistMode } from './boxService.ts'

/** Un client simulé : aucune requête ne part vers la vraie box. */
const fakeClient = (state: string | undefined, filter: { id?: string; mac?: string; type?: string }[], hosts: unknown[] = []) => {
  const calls: string[] = []
  const client: FreeboxClient = {
    get: async <T>(path: string) => {
      calls.push(`GET ${path}`)
      if (path === '/wifi/config/') return { mac_filter_state: state } as T
      if (path === '/wifi/mac_filter/') return filter as T
      if (path === '/lan/browser/pub/') return hosts as T
      throw new Error(path)
    },
    put: async <T>(path: string, body: unknown) => {
      calls.push(`PUT ${path} ${JSON.stringify(body)}`)
      return undefined as T
    },
    post: async <T>(path: string, body: unknown) => {
      calls.push(`POST ${path} ${JSON.stringify(body)}`)
      return undefined as T
    },
    del: async <T>(path: string) => {
      calls.push(`DELETE ${path}`)
      return undefined as T
    },
  }
  return { service: createBoxService(client), calls }
}
const MAC = 'AA:BB:CC:DD:EE:01'
const writes = (calls: string[]) => calls.filter((call) => !call.startsWith('GET'))

test('macFilter : le mode et les adresses listées', async () => {
  const { service } = fakeClient('blacklist', [{ id: 'a', mac: MAC.toLowerCase(), type: 'blacklist' }, { id: 'b' }])
  assert.deepEqual(await service.macFilter(), { state: 'blacklist', entries: [{ id: 'a', mac: MAC, type: 'blacklist' }] })
  assert.equal((await fakeClient(undefined, [{ id: 'a', mac: MAC }]).service.macFilter()).state, null)
  assert.equal((await fakeClient('disabled', [{ id: 'a', mac: MAC }]).service.macFilter()).entries[0].type, '')
})

test('exclure avec le filtrage coupé : active la liste noire puis ajoute la MAC', async () => {
  const { service, calls } = fakeClient('disabled', [])
  assert.deepEqual(await service.setExcluded(MAC, true), { excluded: true })
  assert.deepEqual(writes(calls), ['PUT /wifi/config/ {"mac_filter_state":"blacklist"}', `POST /wifi/mac_filter/ {"mac":"${MAC}","type":"blacklist","comment":"${EXCLUDE_COMMENT}"}`])
})

test('exclure en liste noire déjà active : seulement la MAC, et rien si elle y est déjà', async () => {
  const first = fakeClient('blacklist', [])
  await first.service.setExcluded(MAC, true)
  assert.equal(writes(first.calls).length, 1)
  const again = fakeClient('blacklist', [{ id: 'x', mac: MAC, type: 'blacklist' }])
  await again.service.setExcluded(MAC, true)
  assert.equal(writes(again.calls).length, 0)
  const unset = fakeClient(undefined, [])
  await unset.service.setExcluded(MAC, true)
  assert.equal(unset.calls.filter((call) => call.startsWith('PUT')).length, 0)
})

test('exclure en liste blanche : refusé, la box n’est pas modifiée', async () => {
  const { service, calls } = fakeClient('whitelist', [])
  await assert.rejects(service.setExcluded(MAC, true), WhitelistMode)
  assert.deepEqual(writes(calls), [])
})

test('réadmettre : supprime les entrées de liste noire de la MAC, et elles seules', async () => {
  const { service, calls } = fakeClient('blacklist', [
    { id: 'AA:BB:CC:DD:EE:01-bl', mac: MAC, type: 'blacklist' },
    { id: 'w', mac: MAC, type: 'whitelist' },
    { id: 'o', mac: 'AA:BB:CC:DD:EE:02', type: 'blacklist' },
  ])
  assert.deepEqual(await service.setExcluded(MAC, false), { excluded: false })
  assert.deepEqual(writes(calls), ['DELETE /wifi/mac_filter/AA:BB:CC:DD:EE:01-bl'])
})

test('lanDevices : les appareils, un nom par défaut sans nom', async () => {
  const { service } = fakeClient('disabled', [], [{ l2ident: { id: MAC }, active: true }])
  assert.deepEqual(await service.lanDevices(), [{ name: MAC, ip: null, mac: MAC, active: true, staticLease: null, type: null, vendor: null }])
  const empty = fakeClient('disabled', [], [{ active: false }])
  assert.equal((await empty.service.lanDevices())[0].name, 'Appareil sans nom')
})

/** Un client simulé par chemin : une valeur, ou une erreur pour une box qui ne répond pas à cette lecture. */
const routedClient = (routes: Record<string, unknown>, writes: string[] = []): FreeboxClient => ({
  get: async <T>(path: string) => {
    const value = routes[path]
    if (value instanceof Error) throw value
    return value as T
  },
  put: async <T>(path: string, body: unknown) => {
    writes.push(`PUT ${path} ${JSON.stringify(body)}`)
    return { enabled: (body as { enabled: boolean }).enabled } as T
  },
  post: async <T>() => undefined as T,
  del: async <T>() => undefined as T,
})
const DOWN = new Error('muette')

test('state : tout ce que la box rend, appareils actifs d’abord puis par nom, baux statiques marqués', async () => {
  const service = createBoxService(
    routedClient({
      '/system/': { model_info: { pretty_name: 'Freebox Pop' }, firmware_version: '4.8', uptime_val: 1234, board_name: 'fbxgw' },
      '/connection/': { state: 'up', type: 'ethernet', ipv4: '82.0.0.1', rate_down: 100, rate_up: 20 },
      '/wifi/config/': { enabled: true },
      '/lan/browser/pub/': [
        { primary_name: 'Zeta', l2ident: { id: MAC }, active: false, host_type: 'smartphone', vendor_name: 'X', l3connectivities: [{ af: 'ipv6', addr: 'fe80::1' }, { af: 'ipv4', addr: '10.0.0.2' }, { af: 'ipv4', addr: '192.168.1.9', active: true }] },
        { names: [{}, { name: 'Alpha' }], l2ident: { id: 'AA:BB:CC:DD:EE:02' }, active: true },
        { l2ident: { id: 'AA:BB:CC:DD:EE:03' }, active: true, primary_name: 'Beta' },
      ],
      '/dhcp/static_lease/': [{ mac: MAC.toLowerCase() }, {}],
    }),
  )
  const state = await service.state()
  assert.deepEqual(
    { ...state, devices: [] },
    {
      configured: true,
      reachable: true,
      model: 'Freebox Pop',
      firmware: '4.8',
      uptime: 1234,
      connection: { state: 'up', type: 'ethernet', ipv4: '82.0.0.1', rateDown: 100, rateUp: 20 },
      wifi: { enabled: true },
      devices: [],
    },
  )
  assert.deepEqual(state.devices.map((device) => [device.name, device.active, device.staticLease, device.ip]), [
    ['Alpha', true, false, null],
    ['Beta', true, false, null],
    ['Zeta', false, true, '192.168.1.9'],
  ])
})

test('state : une lecture muette laisse son champ à null, des valeurs absentes aussi, aucune lecture : box injoignable', async () => {
  const partial = await createBoxService(
    routedClient({ '/system/': {}, '/connection/': {}, '/wifi/config/': {}, '/lan/browser/pub/': DOWN, '/dhcp/static_lease/': DOWN }),
  ).state()
  assert.deepEqual(
    [partial.reachable, partial.model, partial.firmware, partial.uptime, partial.wifi, partial.devices],
    [true, null, null, null, null, []],
  )
  assert.deepEqual(partial.connection, { state: null, type: null, ipv4: null, rateDown: null, rateUp: null })
  const board = await createBoxService(routedClient({ '/system/': { board_name: 'fbxgw' }, '/connection/': DOWN, '/wifi/config/': DOWN, '/lan/browser/pub/': DOWN, '/dhcp/static_lease/': DOWN })).state()
  assert.deepEqual([board.model, board.connection, board.wifi], ['fbxgw', null, null])
  const down = await createBoxService(routedClient({ '/system/': DOWN, '/connection/': DOWN, '/wifi/config/': DOWN, '/lan/browser/pub/': DOWN, '/dhcp/static_lease/': DOWN })).state()
  assert.deepEqual([down.configured, down.reachable, down.model, down.firmware, down.uptime, down.connection, down.wifi, down.devices], [true, false, null, null, null, null, null, []])
})

test('guestWifi : la clé invité, son réseau, ses usages ; null sans clé ; le réseau muet laisse le nom à null', async () => {
  const full = createBoxService(
    routedClient({
      '/wifi/custom_key/': [{ params: {} }, { params: { key: 'secret', description: '  Invités  ', max_use_count: 5 }, users: [{}, {}] }],
      '/wifi/bss/': [{}, { status: { custom_key_ssid: 'Invites' } }],
    }),
  )
  assert.deepEqual(await full.guestWifi(), { ssid: 'Invites', password: 'secret', description: 'Invités', maxUses: 5, users: 2 })
  const bare = createBoxService(routedClient({ '/wifi/custom_key/': [{ params: { key: 'k', description: ' ' } }], '/wifi/bss/': DOWN }))
  assert.deepEqual(await bare.guestWifi(), { ssid: null, password: 'k', description: null, maxUses: null, users: 0 })
  assert.equal(await createBoxService(routedClient({ '/wifi/custom_key/': [{}], '/wifi/bss/': [] })).guestWifi(), null)
  assert.equal(await createBoxService(routedClient({ '/wifi/custom_key/': [], '/wifi/bss/': [] })).guestWifi(), null)
})

test('setWifi : écrit l’état voulu et rend celui de la box ; la liste de filtre absente vaut vide', async () => {
  const written: string[] = []
  const service = createBoxService(routedClient({ '/wifi/config/': { mac_filter_state: 'blacklist' }, '/wifi/mac_filter/': undefined }, written))
  assert.deepEqual(await service.setWifi(false), { enabled: false })
  assert.deepEqual(written, ['PUT /wifi/config/ {"enabled":false}'])
  assert.deepEqual(await service.macFilter(), { state: 'blacklist', entries: [] })
})
