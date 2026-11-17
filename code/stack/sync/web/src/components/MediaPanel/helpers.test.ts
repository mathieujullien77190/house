import { describe, expect, it } from 'vitest'
import { cameraOfPath } from './helpers'

describe('cameraOfPath', () => {
  it('lit la caméra dans le chemin', () => {
    expect(cameraOfPath('clips/cam/a.mp4')).toBe('cam')
  })
  it('rend null sans caméra', () => {
    expect(cameraOfPath('a.jpg')).toBeNull()
  })
})
