import { watchRangeFill } from './rangeFill'

const range = (value: string, extra: Partial<HTMLInputElement> = {}): HTMLInputElement => {
  const input = document.createElement('input')
  input.type = 'range'
  Object.assign(input, extra)
  input.value = value
  return input
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const share = (input: HTMLInputElement) => input.style.getPropertyValue('--p')

describe('watchRangeFill', () => {
  it('pose la part choisie sur les curseurs déjà là, et suit leurs changements', async () => {
    document.body.innerHTML = ''
    const before = range('50')
    document.body.append(before)
    watchRangeFill()
    expect(share(before)).toBe('0.5')

    // un curseur ajouté, seul ou dans un bloc
    const added = range('25', { min: '0', max: '50' })
    document.body.append(added)
    const wrap = document.createElement('div')
    const inner = range('100')
    wrap.append(inner)
    document.body.append(wrap)
    document.body.append(document.createTextNode('texte'))
    await tick()
    expect(share(added)).toBe('0.5')
    expect(share(inner)).toBe('1')

    // le doigt : un évènement input
    before.value = '20'
    before.dispatchEvent(new Event('input', { bubbles: true }))
    expect(share(before)).toBe('0.2')

    // un évènement input d un autre champ est ignoré
    const text = document.createElement('input')
    document.body.append(text)
    text.dispatchEvent(new Event('input', { bubbles: true }))
    expect(share(text)).toBe('')
    document.dispatchEvent(new Event('input'))

    // le code : attribut value, min ou max
    added.setAttribute('max', '100')
    await tick()
    expect(share(added)).toBe('0.25')
    text.setAttribute('value', 'x')
    await tick()
    expect(share(text)).toBe('')
  })

  it('une plage vide donne 0, une valeur hors plage est bornée', async () => {
    const flat = range('5', { min: '10', max: '10' })
    const over = range('500', { max: '100' })
    document.body.append(flat, over)
    await tick()
    expect(share(flat)).toBe('0')
    expect(share(over)).toBe('1')
  })
})
