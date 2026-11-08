import { render, screen } from '@testing-library/react'
import CodeBlock from './CodeBlock'

describe('CodeBlock', () => {
  it('montre le code dans un bloc nommé et atteignable au clavier', () => {
    render(<CodeBlock label="Configuration" code={'a: 1\nb: 2'} />)
    const block = screen.getByLabelText('Configuration')
    expect(block.tagName).toBe('PRE')
    expect(block).toHaveAttribute('tabindex', '0')
    expect(block.querySelector('code')?.textContent).toBe('a: 1\nb: 2')
  })
})
