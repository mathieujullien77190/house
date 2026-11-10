import { fireEvent, render, screen } from '@testing-library/react'
import ClipEmoji from './ClipEmoji'

describe('ClipEmoji', () => {
  it('sans emoji : « ＋ Emoji » ouvre la liste, un choix l’enregistre et la referme', () => {
    const onSave = vi.fn().mockResolvedValue('🦊')
    render(<ClipEmoji emoji="" onSave={onSave} />)
    expect(screen.getByRole('button', { name: 'Emoji du clip' })).toHaveTextContent('＋ Emoji')
    expect(screen.queryByRole('group')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    expect(screen.getByRole('group', { name: 'Emoji du clip' })).toBeInTheDocument()
    // pas de « Aucun emoji » quand il n'y en a pas
    expect(screen.queryByRole('button', { name: 'Aucun emoji' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '🦊' }))
    expect(onSave).toHaveBeenCalledWith('🦊')
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('avec un emoji : il est montré et marqué dans la liste ; le choisir de nouveau n’envoie rien ; « Aucun emoji » le retire', () => {
    const onSave = vi.fn().mockResolvedValue('')
    render(<ClipEmoji emoji="🦊" onSave={onSave} />)
    expect(screen.getByRole('button', { name: 'Emoji du clip' })).toHaveTextContent('🦊')
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    expect(screen.getByRole('button', { name: '🦊' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '🦊' }))
    expect(onSave).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aucun emoji' }))
    expect(onSave).toHaveBeenCalledWith(null)
  })

  it('un enregistrement refusé ne casse rien', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('x'))
    render(<ClipEmoji emoji="" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Emoji du clip' }))
    fireEvent.click(screen.getByRole('button', { name: '🦌' }))
    await Promise.resolve()
    expect(onSave).toHaveBeenCalledWith('🦌')
  })
})
