import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'
import ServosSettings from '@/components/ServosSettings'
import type { ServoOrder, ServoSettings } from '@/components/ServosSettings'
import { patchOf } from './helpers'

vi.mock('@/lib/api', () => ({ fetchServos: vi.fn(), saveServos: vi.fn(), testServo: vi.fn() }))
const m = vi.mocked(api)

const order = (channel: number): ServoOrder => ({ channel, start: -42, end: -50, speed: 10, hold: 0.5 })
const settings = (): ServoSettings => ({
  url: 'http://192.168.1.115',
  shutters: {
    '2': { down: order(0), up: order(1), stop: order(2) },
    '5': { down: order(3), up: order(4), stop: order(5) },
    '6': { down: order(6), up: order(7), stop: order(8) },
  },
})
const CHANNEL = 'Salon · Monter · Canal (0-15)'
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const loaded = async () => {
  render(<ServosSettings />)
  await screen.findByLabelText(CHANNEL)
}

beforeEach(() => {
  vi.resetAllMocks()
  m.fetchServos.mockResolvedValue(settings())
})

describe('chargement', () => {
  it('montre les réglages lus', async () => {
    await loaded()
    expect(field(CHANNEL).value).toBe('1')
    expect(field('PC · Stop · Canal (0-15)').value).toBe('5')
    expect(screen.getByDisplayValue('http://192.168.1.115')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Tester' })).toHaveLength(9)
  })

  it('rien tant que la lecture n’est pas revenue', () => {
    m.fetchServos.mockReturnValue(new Promise(() => undefined))
    const { container } = render(<ServosSettings />)
    expect(container.innerHTML).toBe('')
  })

  it('lecture impossible : un message', async () => {
    m.fetchServos.mockRejectedValue(new Error('non'))
    render(<ServosSettings />)
    expect(await screen.findByText(/n’ont pas pu être lus/)).toBeTruthy()
  })

  it('démonté avant la réponse : rien n’est rangé', async () => {
    let answer: (value: ServoSettings) => void = () => undefined
    m.fetchServos.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)))
    const { unmount } = render(<ServosSettings />)
    unmount()
    answer(settings())
    let fail: (reason: Error) => void = () => undefined
    m.fetchServos.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)))
    const second = render(<ServosSettings />)
    second.unmount()
    fail(new Error('non'))
    await Promise.resolve()
  })
})

describe('enregistrement', () => {
  it('un champ modifié est envoyé en le quittant, puis les réglages rendus sont montrés', async () => {
    await loaded()
    const saved = settings()
    saved.shutters['2'].up.channel = 9
    m.saveServos.mockResolvedValue(saved)
    fireEvent.change(field(CHANNEL), { target: { value: '9' } })
    expect(field(CHANNEL).value).toBe('9')
    fireEvent.blur(field(CHANNEL))
    await waitFor(() => expect(m.saveServos).toHaveBeenCalledWith({ shutters: { '2': { up: { channel: 9 } } } }))
    await waitFor(() => expect(field(CHANNEL).value).toBe('9'))
  })

  it('Entrée enregistre aussi, une autre touche non', async () => {
    await loaded()
    m.saveServos.mockResolvedValue(settings())
    fireEvent.change(field(CHANNEL), { target: { value: '3' } })
    fireEvent.keyDown(field(CHANNEL), { key: 'a' })
    expect(m.saveServos).not.toHaveBeenCalled()
    fireEvent.keyDown(field(CHANNEL), { key: 'Enter' })
    await waitFor(() => expect(m.saveServos).toHaveBeenCalledTimes(1))
  })

  it('l’adresse : enregistrée, Entrée ou en quittant', async () => {
    await loaded()
    m.saveServos.mockResolvedValue(settings())
    const url = screen.getByDisplayValue('http://192.168.1.115')
    fireEvent.change(url, { target: { value: ' http://autre ' } })
    fireEvent.keyDown(url, { key: 'Enter' })
    await waitFor(() => expect(m.saveServos).toHaveBeenCalledWith({ url: 'http://autre' }))
    fireEvent.change(url, { target: { value: 'http://autre2' } })
    fireEvent.keyDown(url, { key: 'x' })
    fireEvent.blur(url)
    await waitFor(() => expect(m.saveServos).toHaveBeenCalledTimes(2))
  })

  it('texte inchangé ou vide, ou rien de saisi : rien n’est envoyé', async () => {
    await loaded()
    fireEvent.blur(field(CHANNEL))
    fireEvent.change(field(CHANNEL), { target: { value: '1' } })
    fireEvent.blur(field(CHANNEL))
    fireEvent.change(field(CHANNEL), { target: { value: '' } })
    fireEvent.blur(field(CHANNEL))
    await waitFor(() => expect(field(CHANNEL).value).toBe('1'))
    expect(m.saveServos).not.toHaveBeenCalled()
  })

  it('un refus : message, le champ revient à la valeur gardée ; un succès efface le message', async () => {
    await loaded()
    m.saveServos.mockRejectedValueOnce(new Error('400'))
    fireEvent.change(field(CHANNEL), { target: { value: '99' } })
    fireEvent.blur(field(CHANNEL))
    expect(await screen.findByText(/n’a pas pu être enregistré/)).toBeTruthy()
    await waitFor(() => expect(field(CHANNEL).value).toBe('1'))
    m.saveServos.mockResolvedValueOnce(settings())
    fireEvent.change(field(CHANNEL), { target: { value: '4' } })
    fireEvent.blur(field(CHANNEL))
    await waitFor(() => expect(screen.queryByText(/n’a pas pu être enregistré/)).toBeNull())
  })
})

describe('tests', () => {
  it('Tester joue la séquence, le bouton est grisé pendant l’appel', async () => {
    await loaded()
    let done: () => void = () => undefined
    m.testServo.mockReturnValue(new Promise<void>((resolve) => (done = resolve)))
    const buttons = screen.getAllByRole('button', { name: 'Tester' })
    fireEvent.click(buttons[0])
    expect(m.testServo).toHaveBeenCalledWith('2', 'up', false)
    await waitFor(() => expect((buttons[0] as HTMLButtonElement).disabled).toBe(true))
    done()
    await waitFor(() => expect((buttons[0] as HTMLButtonElement).disabled).toBe(false))
  })

  it('Origine met le servo à 0°', async () => {
    await loaded()
    m.testServo.mockResolvedValue(undefined)
    fireEvent.click(screen.getAllByRole('button', { name: 'Origine' })[1])
    await waitFor(() => expect(m.testServo).toHaveBeenCalledWith('2', 'down', true))
  })

  it('un échec du test : message sous l’ordre', async () => {
    await loaded()
    m.testServo.mockRejectedValue(new Error('502'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Tester' })[0])
    expect(await screen.findByText(/ne répond pas/)).toBeTruthy()
  })
})

describe('patchOf', () => {
  it('le champ voulu, ou rien', () => {
    expect(patchOf(settings(), '5.up.end', '30')).toEqual({ shutters: { '5': { up: { end: 30 } } } })
    expect(patchOf(settings(), '5.up.end', 'abc')).toBeNull()
    expect(patchOf(settings(), 'url', 'http://192.168.1.115')).toBeNull()
  })
})
