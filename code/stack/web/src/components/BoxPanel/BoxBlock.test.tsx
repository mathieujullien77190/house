import { fireEvent, render, screen } from '@testing-library/react'
import type { BoxDevice, BoxState } from '@/types'
import BoxBlock from './BoxBlock'
import { CONFIRM_NO, CONFIRM_YES, NO_DEVICE_TEXT, SEND_ERROR_TEXT, UNREACHABLE_TEXT, WIFI_BUSY_TEXT, WIFI_OFF_STATE, WIFI_ON_STATE, WIFI_SWITCH_LABEL } from './constants'
import { formatRate, formatUptime, leaseText, lineText, listedDevices } from './helpers'

const device = (over: Partial<BoxDevice> = {}): BoxDevice => ({ staticLease: false, home: true, name: 'Tel', ip: '192.168.1.9', mac: 'AA:01', active: true, type: 'smartphone', vendor: null, ...over })
const box = (over: Partial<BoxState> = {}): BoxState => ({
  configured: true,
  reachable: true,
  model: 'Freebox Pop',
  firmware: '4.8',
  uptime: 90_000,
  connection: { state: 'up', type: 'ethernet', ipv4: '82.0.0.1', rateDown: 1_000_000, rateUp: 50_000 },
  wifi: { enabled: true },
  devices: [device(), device({ mac: 'AA:02', name: 'Montre', ip: null, active: false, staticLease: null })],
  ...over,
})

describe('helpers', () => {
  it('formatUptime', () => {
    expect(formatUptime(null)).toBe('–')
    expect(formatUptime(6 * 86_400 + 14 * 3600 + 34 * 60)).toBe('6 j 14 h 34 min')
    expect(formatUptime(3 * 3600 + 60)).toBe('3 h 1 min')
    expect(formatUptime(120)).toBe('2 min')
    expect(formatUptime(86_400)).toBe('1 j 0 h 0 min')
  })

  it('formatRate', () => {
    expect(formatRate(null)).toBe('–')
    expect(formatRate(1_000_000)).toBe('8,0 Mb/s')
    expect(formatRate(12_500)).toBe('100 kb/s')
  })

  it('lineText', () => {
    expect(lineText(null)).toBe('–')
    expect(lineText({ state: null, type: 'x', ipv4: null, rateDown: null, rateUp: null })).toBe('–')
    expect(lineText({ state: 'up', type: 'ethernet', ipv4: null, rateDown: null, rateUp: null })).toBe('En ligne (ethernet)')
    expect(lineText({ state: 'down', type: null, ipv4: null, rateDown: null, rateUp: null })).toBe('Coupée')
    expect(lineText({ state: 'bizarre', type: null, ipv4: null, rateDown: null, rateUp: null })).toBe('bizarre')
  })

  it('leaseText', () => {
    expect(leaseText(null)).toBe('–')
    expect(leaseText(true)).toBe('IP fixe')
    expect(leaseText(false)).toBe('IP dynamique')
  })

  it('listedDevices : maison et baux statiques, baux statiques d’abord puis par nom', () => {
    const list = listedDevices([
      device({ name: 'b', mac: '1' }),
      device({ name: 'z', mac: '2', staticLease: true, home: false, active: false }),
      device({ name: 'a', mac: '3', home: undefined, active: true }),
      device({ name: 'c', mac: '4', home: undefined, active: false }),
      device({ name: 'invité', mac: '5', home: false }),
    ])
    expect(list.map((d) => d.mac)).toEqual(['2', '3', '1'])
  })
})

describe('BoxBlock', () => {
  const props = { busy: false, failed: false, onWifi: vi.fn() }

  it('état, WiFi et appareils (connectés / total)', () => {
    render(<BoxBlock box={box()} {...props} />)
    expect(screen.getByText('État de la box · Freebox Pop')).toBeTruthy()
    expect(screen.getByText('En ligne (ethernet)')).toBeTruthy()
    expect(screen.getByText('82.0.0.1')).toBeTruthy()
    expect(screen.getByText('4.8')).toBeTruthy()
    expect(screen.getByText(WIFI_ON_STATE)).toBeTruthy()
    expect(screen.getByText('Appareils du réseau (1 / 2)')).toBeTruthy()
    expect(screen.getByText('Montre')).toBeTruthy()
    expect(screen.getByLabelText('Connecté')).toBeTruthy()
  })

  it('compact : sans firmware ; sans modèle ni connexion ni firmware : des tirets', () => {
    render(<BoxBlock box={box({ model: null, connection: null, firmware: null })} {...props} compact />)
    expect(screen.getByText('État de la box')).toBeTruthy()
    expect(screen.queryByText('Firmware')).toBeNull()
  })

  it('sans firmware connu hors compact : un tiret', () => {
    render(<BoxBlock box={box({ firmware: null, uptime: null })} {...props} />)
    expect(screen.getByText('Firmware')).toBeTruthy()
  })

  it('allumer le WiFi est direct ; le couper demande une confirmation, qu’on peut annuler', () => {
    const onWifi = vi.fn()
    const { rerender } = render(<BoxBlock box={box({ wifi: { enabled: false } })} {...props} onWifi={onWifi} />)
    expect(screen.getByText(WIFI_OFF_STATE)).toBeTruthy()
    fireEvent.click(screen.getByRole('switch', { name: WIFI_SWITCH_LABEL }))
    expect(onWifi).toHaveBeenCalledWith(true)
    rerender(<BoxBlock box={box()} {...props} onWifi={onWifi} />)
    fireEvent.click(screen.getByRole('switch', { name: WIFI_SWITCH_LABEL }))
    expect(onWifi).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_NO }))
    expect(screen.queryByRole('button', { name: CONFIRM_YES })).toBeNull()
    fireEvent.click(screen.getByRole('switch', { name: WIFI_SWITCH_LABEL }))
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_YES }))
    expect(onWifi).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('button', { name: CONFIRM_YES })).toBeNull()
  })

  it('en cours d’envoi : interrupteur grisé et texte ; échec : message', () => {
    render(<BoxBlock box={box()} busy failed onWifi={vi.fn()} wifiExtra={<span>extra</span>} />)
    expect((screen.getByRole('switch', { name: WIFI_SWITCH_LABEL }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(WIFI_BUSY_TEXT)).toBeTruthy()
    expect(screen.getByText(SEND_ERROR_TEXT)).toBeTruthy()
    expect(screen.getByText('extra')).toBeTruthy()
  })

  it('sans état du WiFi, pas de bloc WiFi', () => {
    render(<BoxBlock box={box({ wifi: null })} {...props} />)
    expect(screen.queryByRole('switch')).toBeNull()
    fireEvent.click(screen.getByText('État de la box · Freebox Pop'))
  })

  it('sans appareil : le dit ; appareil sans MAC : clé par le nom', () => {
    const { unmount } = render(<BoxBlock box={box({ devices: [] })} {...props} />)
    expect(screen.getByText(NO_DEVICE_TEXT)).toBeTruthy()
    unmount()
    render(<BoxBlock box={box({ devices: [device({ mac: '', name: 'Sans MAC' })] })} {...props} compact />)
    expect(screen.getByText('Sans MAC')).toBeTruthy()
  })

  it('box muette : message, ni WiFi ni appareils', () => {
    render(<BoxBlock box={box({ reachable: false })} {...props} />)
    expect(screen.getByText(UNREACHABLE_TEXT)).toBeTruthy()
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByText(/Appareils du réseau/)).toBeNull()
  })
})
