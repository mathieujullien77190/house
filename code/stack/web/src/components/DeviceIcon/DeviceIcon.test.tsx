import { render } from '@testing-library/react'
import { LuCircleHelp, LuSmartphone } from 'react-icons/lu'
import { RiLightbulbFill } from 'react-icons/ri'
import { TbAirConditioning } from 'react-icons/tb'
import DeviceIcon from './DeviceIcon'
import { iconOf } from './helpers'

const device = (over: Partial<Parameters<typeof iconOf>[0]> = {}) => ({ type: null, name: 'Appareil', vendor: null, ...over })

describe('iconOf', () => {
  it('le nom ou le fabricant d’abord (le premier qui correspond gagne)', () => {
    expect(iconOf(device({ vendor: 'Philips Lighting', type: 'smartphone' }))).toBe(RiLightbulbFill)
    expect(iconOf(device({ name: 'Clim salon' }))).toBe(TbAirConditioning)
  })

  it('sinon le type de la box ; type inconnu ou absent : le point d’interrogation', () => {
    expect(iconOf(device({ type: 'smartphone' }))).toBe(LuSmartphone)
    expect(iconOf(device({ type: 'machin' }))).toBe(LuCircleHelp)
    expect(iconOf(device())).toBe(LuCircleHelp)
  })
})

describe('DeviceIcon', () => {
  it('dessine une icône cachée aux lecteurs d’écran', () => {
    const { container } = render(<DeviceIcon device={device({ type: 'smartphone' })} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })
})
