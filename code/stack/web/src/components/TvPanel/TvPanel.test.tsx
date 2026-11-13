import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import type { TvState } from '@/types'
import TvPanel from './TvPanel'
import {
  BACK_LABEL,
  BAD_CODE_TEXT,
  CHANNEL_DIGIT_MS,
  CODE_LABEL,
  EXPIRED_TEXT,
  LONG_PRESS_MS,
  NOT_CONFIGURED_TITLE,
  NOT_PAIRED_KEY_TEXT,
  NOT_PAIRED_TITLE,
  PAIR_FAILED_TEXT,
  RESTART_LABEL,
  SEND_ERROR_TEXT,
  SEND_FAILED_TEXT,
  SLOW_TEXT,
  START_LABEL,
  START_OFF_TEXT,
  SUBMIT_LABEL,
  UNAVAILABLE_TEXT,
} from './constants'
import { cleanCode, isCodeComplete, isWrongCode, pairErrorText, sendErrorText } from './helpers'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchTv: vi.fn(),
  sendTvKey: vi.fn(),
  startTvPairing: vi.fn(),
  finishTvPairing: vi.fn(),
  forgetTvPairing: vi.fn(),
}))
const api = await import('@/lib/api')

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const settle = async (ms = 0) => {
  await act(async () => {
    vi.advanceTimersByTime(ms)
    await flush()
  })
}
const state = (over: Partial<TvState> = {}): TvState => ({ configured: true, paired: true, online: true, ...over })

describe('helpers', () => {
  it('textes d’état et d’erreur', () => {
    expect(sendErrorText(new api.ApiError(502, 'x'))).toBe(SEND_ERROR_TEXT)
    expect(sendErrorText(new api.ApiError(409, 'x'))).toBe(NOT_PAIRED_KEY_TEXT)
    expect(sendErrorText(new Error('x'))).toBe(SEND_FAILED_TEXT)
  })

  it('textes d’échec de l’association, saisie du code', () => {
    expect(pairErrorText(new api.ApiError(502, 'x'))).toBe(START_OFF_TEXT)
    expect(pairErrorText(new api.ApiError(504, 'x'))).toBe(SLOW_TEXT)
    expect(pairErrorText(new api.ApiError(422, 'x'))).toBe(BAD_CODE_TEXT)
    expect(pairErrorText(new api.ApiError(409, 'x'))).toBe(EXPIRED_TEXT)
    expect(pairErrorText(new api.ApiError(500, 'x'))).toBe(PAIR_FAILED_TEXT)
    expect(pairErrorText(new Error('x'))).toBe(PAIR_FAILED_TEXT)
    expect(isWrongCode(new api.ApiError(422, 'x'))).toBe(true)
    expect(isWrongCode(new api.ApiError(409, 'x'))).toBe(false)
    expect(isWrongCode(null)).toBe(false)
    expect(cleanCode('1a-2b3c4d5')).toBe('1A2B3C')
    expect(cleanCode('zz')).toBe('')
    expect(isCodeComplete('1A2B3C')).toBe(true)
    expect(isCodeComplete('1A2B3')).toBe(false)
  })
})

describe('TvPanel', () => {
  it('l’API muette : message', async () => {
    vi.mocked(api.fetchTv).mockRejectedValue(new Error('x'))
    render(<TvPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(UNAVAILABLE_TEXT)).toBeTruthy()
  })

  it('non configurée : la note remplace la télécommande', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ configured: false, paired: false, online: null }))
    render(<TvPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(NOT_CONFIGURED_TITLE)).toBeTruthy()
    expect(screen.queryByLabelText('Volume plus')).toBeNull()
  })

  it('appui bref envoyé au relâchement, appui long après 600 ms, erreur claire', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ online: false }))
    vi.mocked(api.sendTvKey).mockResolvedValue(undefined)
    render(<TvPanel apiKey="k" />)
    await settle()

    const plus = screen.getByLabelText('Volume plus')
    fireEvent.pointerDown(plus, { button: 0 })
    fireEvent.pointerUp(plus)
    await settle(300)
    expect(api.sendTvKey).toHaveBeenCalledWith('k', 'vol_inc', false)

    const ok = screen.getByLabelText('OK')
    fireEvent.pointerDown(ok, { button: 0 })
    await settle(LONG_PRESS_MS)
    fireEvent.pointerUp(ok)
    expect(api.sendTvKey).toHaveBeenCalledWith('k', 'ok', true)
    expect(api.sendTvKey).toHaveBeenCalledTimes(2)

    // sorti de la touche avant le relâchement, ou bouton droit : rien n'est envoyé
    const mute = screen.getByLabelText('Muet')
    fireEvent.pointerDown(mute, { button: 0 })
    fireEvent.pointerLeave(mute)
    fireEvent.pointerUp(mute)
    fireEvent.pointerDown(mute, { button: 2 })
    fireEvent.pointerUp(mute)
    fireEvent.contextMenu(mute)
    expect(api.sendTvKey).toHaveBeenCalledTimes(2)

    // clavier (clic sans souris), puis échec 502
    vi.mocked(api.sendTvKey).mockRejectedValue(new api.ApiError(502, 'x'))
    fireEvent.click(screen.getByLabelText('Arrêter le Player'), { detail: 0 })
    fireEvent.click(mute, { detail: 1 })
    await settle()
    expect(api.sendTvKey).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('alert').textContent).toBe(SEND_ERROR_TEXT)
  })
})

describe('chaînes et retour', () => {
  it('une chaîne tape ses chiffres l’un après l’autre', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state())
    vi.mocked(api.sendTvKey).mockResolvedValue(undefined)
    render(<TvPanel apiKey="k" />)
    await settle()
    fireEvent.click(screen.getByLabelText('TMC (chaîne 10)'))
    expect(api.sendTvKey).not.toHaveBeenCalled()
    await settle(0)
    expect(api.sendTvKey).toHaveBeenCalledWith('k', '1', false)
    await settle(CHANNEL_DIGIT_MS)
    expect(api.sendTvKey).toHaveBeenLastCalledWith('k', '0', false)
  })

  it('sur téléphone, « Retour » est présent dans chaque état et ramène à Home ; sur ordinateur il n’y en a pas', async () => {
    const onBack = vi.fn()
    vi.mocked(api.fetchTv).mockReturnValue(new Promise(() => undefined))
    const loading = render(<TvPanel apiKey="k" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText(BACK_LABEL))
    expect(onBack).toHaveBeenCalledTimes(1)
    loading.unmount()
    for (const over of [{ configured: false, paired: false, online: null }, { paired: false }, {}]) {
      vi.mocked(api.fetchTv).mockResolvedValue(state(over))
      const view = render(<TvPanel apiKey="k" onBack={onBack} />)
      await settle()
      expect(screen.getAllByLabelText(BACK_LABEL)).toHaveLength(1)
      view.unmount()
    }
    vi.mocked(api.fetchTv).mockResolvedValue(state())
    render(<TvPanel apiKey="k" />)
    await settle()
    expect(screen.queryByLabelText(BACK_LABEL)).toBeNull()
  })
})

describe('association du Player', () => {
  const type = (value: string) => fireEvent.change(screen.getByLabelText(CODE_LABEL), { target: { value } })
  const start = async () => {
    fireEvent.click(screen.getByRole('button', { name: START_LABEL }))
    await settle()
  }

  it('trois étapes : Associer, saisie du code (filtrée), Valider, puis la télécommande', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ paired: false }))
    vi.mocked(api.startTvPairing).mockResolvedValue(undefined)
    vi.mocked(api.finishTvPairing).mockResolvedValue(undefined)
    render(<TvPanel apiKey="k" />)
    await settle()
    expect(screen.getByText(NOT_PAIRED_TITLE)).toBeTruthy()
    expect(screen.queryByLabelText('Volume plus')).toBeNull()
    expect(screen.queryByLabelText(CODE_LABEL)).toBeNull()

    await start()
    expect(api.startTvPairing).toHaveBeenCalledWith('k')
    type('1a-2b3c4d')
    expect((screen.getByLabelText(CODE_LABEL) as HTMLInputElement).value).toBe('1A2B3C')
    fireEvent.click(screen.getByRole('button', { name: SUBMIT_LABEL }))
    await settle()
    expect(api.finishTvPairing).toHaveBeenCalledWith('k', '1A2B3C')
    expect(screen.getByLabelText('Volume plus')).toBeTruthy()
  })

  it('Valider reste inactif tant que le code est incomplet ; Entrée n’envoie rien', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ paired: false }))
    vi.mocked(api.startTvPairing).mockResolvedValue(undefined)
    render(<TvPanel apiKey="k" />)
    await settle()
    await start()
    type('1A')
    expect((screen.getByRole('button', { name: SUBMIT_LABEL }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.submit(screen.getByLabelText(CODE_LABEL).closest('form') as HTMLFormElement)
    expect(api.finishTvPairing).not.toHaveBeenCalled()
  })

  it('Player éteint ou lent : message clair, on peut réessayer', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ paired: false }))
    vi.mocked(api.startTvPairing).mockRejectedValueOnce(new api.ApiError(502, 'x')).mockRejectedValueOnce(new api.ApiError(504, 'x'))
    render(<TvPanel apiKey="k" />)
    await settle()
    await start()
    expect(screen.getByRole('alert').textContent).toBe(START_OFF_TEXT)
    await start()
    expect(screen.getByRole('alert').textContent).toBe(SLOW_TEXT)
  })

  it('code faux : on le ressaisit ; association expirée : on recommence', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ paired: false }))
    vi.mocked(api.startTvPairing).mockResolvedValue(undefined)
    vi.mocked(api.finishTvPairing).mockRejectedValueOnce(new api.ApiError(422, 'x')).mockRejectedValueOnce(new api.ApiError(409, 'x'))
    render(<TvPanel apiKey="k" />)
    await settle()
    await start()
    type('AAAAAA')
    fireEvent.click(screen.getByRole('button', { name: SUBMIT_LABEL }))
    await settle()
    expect(screen.getByRole('alert').textContent).toBe(BAD_CODE_TEXT)
    expect(screen.getByLabelText(CODE_LABEL)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT_LABEL }))
    await settle()
    expect(screen.getByRole('alert').textContent).toBe(EXPIRED_TEXT)
    expect(screen.queryByLabelText(CODE_LABEL)).toBeNull()
  })

  it('Recommencer relance l’association', async () => {
    vi.mocked(api.fetchTv).mockResolvedValue(state({ paired: false }))
    vi.mocked(api.startTvPairing).mockResolvedValue(undefined)
    render(<TvPanel apiKey="k" />)
    await settle()
    await start()
    fireEvent.click(screen.getByRole('button', { name: RESTART_LABEL }))
    await settle()
    expect(api.startTvPairing).toHaveBeenCalledTimes(2)
  })

})

describe('démontage', () => {
  it('une lecture qui revient après la fermeture de l’onglet est ignorée', async () => {
    let resolve: (value: TvState) => void = () => undefined
    let reject: (reason: Error) => void = () => undefined
    vi.mocked(api.fetchTv)
      .mockReturnValueOnce(new Promise<TvState>((done) => (resolve = done)))
      .mockReturnValueOnce(new Promise<TvState>((_done, fail) => (reject = fail)))
    const first = render(<TvPanel apiKey="k" />)
    first.unmount()
    resolve(state())
    const second = render(<TvPanel apiKey="k" />)
    second.unmount()
    reject(new Error('x'))
    await settle()
    expect(api.fetchTv).toHaveBeenCalledTimes(2)
  })
})
