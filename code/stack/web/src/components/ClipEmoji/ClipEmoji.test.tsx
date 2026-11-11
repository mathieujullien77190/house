import { fireEvent, render, screen } from '@testing-library/react'
import ClipEmoji from './ClipEmoji'
import { lastSymbol } from './helpers'

describe('lastSymbol', () => {
  it('garde le dernier symbole entier, vide si rien', () => {
    expect(lastSymbol('')).toBe('')
    expect(lastSymbol('  ')).toBe('')
    expect(lastSymbol('🦊')).toBe('🦊')
    expect(lastSymbol('🦊🐇')).toBe('🐇')
    expect(lastSymbol('🐿️')).toBe('🐿️')
    expect(lastSymbol('🧑‍🌾')).toBe('🧑‍🌾')
  })
})

describe('ClipEmoji', () => {
  it('sans emoji : « ＋ » ouvre un champ, Entrée enregistre le symbole tapé', () => {
    const onSave = vi.fn().mockResolvedValue('🦊')
    render(<ClipEmoji emoji="" onSave={onSave} />)
    expect(screen.getByRole('button', { name: 'Emoji du clip' })).toHaveTextContent('＋')
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    const input = screen.getByRole('textbox', { name: 'Emoji du clip' })
    fireEvent.change(input, { target: { value: '🦊' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('🦊')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('un texte plus long ne garde que le dernier symbole ; un clic ailleurs enregistre', () => {
    const onSave = vi.fn().mockResolvedValue('🐇')
    render(<ClipEmoji emoji="🦊" onSave={onSave} />)
    expect(screen.getByRole('button', { name: 'Emoji du clip' })).toHaveTextContent('🦊')
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    const input = screen.getByRole('textbox', { name: 'Emoji du clip' })
    expect(input).toHaveValue('🦊')
    fireEvent.change(input, { target: { value: '🦊🐇' } })
    expect(input).toHaveValue('🐇')
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledWith('🐇')
  })

  it('inchangé ou annulé : rien n’est envoyé ; champ vide : l’emoji est retiré', () => {
    const onSave = vi.fn().mockResolvedValue('')
    render(<ClipEmoji emoji="🦊" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '🐇' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith(null)
  })

  it('un enregistrement refusé ne casse rien', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('x'))
    render(<ClipEmoji emoji="" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '🦌' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    await Promise.resolve()
    expect(onSave).toHaveBeenCalledWith('🦌')
  })
})
