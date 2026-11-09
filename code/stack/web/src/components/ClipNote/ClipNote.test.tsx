import { act, fireEvent, render, screen } from '@testing-library/react'
import { flush } from '@/test/fetch'
import ClipNote from './ClipNote'

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Note du clip' }))
const field = () => screen.getByRole('textbox', { name: 'Note du clip' })

describe('ClipNote', () => {
  it('sans note : « ＋ Note » ; avec : le texte', () => {
    const first = render(<ClipNote note="" onSave={vi.fn()} />)
    expect(screen.getByText('＋ Note')).toBeInTheDocument()
    first.unmount()
    render(<ClipNote note="renard" onSave={vi.fn()} />)
    expect(screen.getByText('renard')).toBeInTheDocument()
  })

  it('un clic ouvre le champ avec la note, Entrée l’enregistre sans espaces autour', () => {
    const onSave = vi.fn().mockResolvedValue('chat')
    render(<ClipNote note="renard" onSave={onSave} />)
    open()
    expect(field()).toHaveValue('renard')
    fireEvent.change(field(), { target: { value: '  chat ' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('chat')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('sortir du champ enregistre aussi', () => {
    const onSave = vi.fn().mockResolvedValue('x')
    render(<ClipNote note="" onSave={onSave} />)
    open()
    fireEvent.change(field(), { target: { value: 'mésange' } })
    fireEvent.blur(field())
    expect(onSave).toHaveBeenCalledWith('mésange')
  })

  it('un texte inchangé n’enregistre rien', () => {
    const onSave = vi.fn()
    render(<ClipNote note="renard" onSave={onSave} />)
    open()
    fireEvent.change(field(), { target: { value: ' renard ' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Échap annule', () => {
    const onSave = vi.fn()
    render(<ClipNote note="renard" onSave={onSave} />)
    open()
    fireEvent.change(field(), { target: { value: 'chat' } })
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('renard')).toBeInTheDocument()
  })

  it('une autre touche ne ferme pas le champ ; un champ vide supprime la note', () => {
    const onSave = vi.fn().mockResolvedValue('')
    render(<ClipNote note="renard" onSave={onSave} />)
    open()
    fireEvent.keyDown(field(), { key: 'a' })
    expect(field()).toBeInTheDocument()
    fireEvent.change(field(), { target: { value: '' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('')
  })

  it('un échec de l’enregistrement est sans suite', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('x'))
    render(<ClipNote note="" onSave={onSave} />)
    open()
    fireEvent.change(field(), { target: { value: 'chat' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    await act(flush)
    expect(screen.getByRole('button', { name: 'Note du clip' })).toBeInTheDocument()
  })
})
