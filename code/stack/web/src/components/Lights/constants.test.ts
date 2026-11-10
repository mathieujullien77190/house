import { PLAN_CAMERAS, PLAN_CAMERA_LINKS } from './constants'

describe('PLAN_CAMERA_LINKS', () => {
  it('chaque caméra de la maison pointe vers une icône du plan', () => {
    const ids = PLAN_CAMERAS.map((camera) => camera.id)
    for (const id of Object.values(PLAN_CAMERA_LINKS)) expect(ids).toContain(id)
  })
  it('la caméra voliere-toit est l’icône de l’entrée, sur la maison', () => {
    expect(PLAN_CAMERA_LINKS['voliere-toit']).toBe('entree')
    expect(PLAN_CAMERAS.find((camera) => camera.id === 'entree')?.name).toContain('voliere-toit')
  })
})
