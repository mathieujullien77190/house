import { describe, expect, it } from 'vitest'
import { diskLineY, diskPath, diskTitleY, lineY, markerId, panelTitlePos, titleY } from './helpers'
import type { ArchBox, ArchDisk, ArchPanel } from '../types'

const box: ArchBox = { id: 'b', x: 10, y: 100, w: 200, h: 80, tone: 'plain', title: 'Titre', lines: ['a', 'b'] }
const panel: ArchPanel = { id: 'p', x: 10, y: 20, w: 300, h: 200, tone: 'panel', title: 'Cadre' }
const disk: ArchDisk = { id: 'd', cx: 100, cy: 50, title: 'Disque', lines: ['un'] }

describe('ArchDiagram helpers', () => {
  it('markerId : un nom par schéma', () => {
    expect(markerId('hardware')).toBe('arch-arrow-hardware')
  })

  it('titleY et lineY : le bloc est centré, chaque ligne descend', () => {
    expect(lineY(box, 1) - lineY(box, 0)).toBeGreaterThan(0)
    expect(lineY(box, 0)).toBeGreaterThan(titleY(box))
    const taller = { ...box, lines: ['a', 'b', 'c'] }
    expect(titleY(taller)).toBeLessThan(titleY(box))
  })

  it('panelTitlePos : en haut à gauche, à droite avec titleEnd, plus compact pour le cadre Docker', () => {
    expect(panelTitlePos(panel)).toEqual({ x: 30, y: 48, anchor: 'start' })
    expect(panelTitlePos({ ...panel, tone: 'warm' })).toEqual({ x: 26, y: 42, anchor: 'start' })
    expect(panelTitlePos({ ...panel, titleEnd: true })).toEqual({ x: 294, y: 48, anchor: 'end' })
    expect(panelTitlePos({ ...panel, tone: 'warm', titleEnd: true })).toEqual({ x: 294, y: 42, anchor: 'end' })
  })

  it('diskPath : le corps grandit avec les lignes, rx par défaut ou donné', () => {
    const one = diskPath(disk)
    expect(one.startsWith('M')).toBe(true)
    expect(diskPath({ ...disk, lines: ['un', 'deux', 'trois'] })).not.toBe(one)
    expect(diskPath({ ...disk, rx: 90 })).not.toBe(one)
    expect(diskPath({ ...disk, lines: [] })).toBe(diskPath({ ...disk, lines: ['x'] }))
  })

  it('diskTitleY et diskLineY', () => {
    expect(diskTitleY(disk)).toBe(92)
    expect(diskLineY(disk, 0)).toBe(110)
    expect(diskLineY(disk, 1)).toBeGreaterThan(diskLineY(disk, 0))
  })
})
