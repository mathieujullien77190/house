import { MIN_VALUE } from './constants'

export const nextValue = (value: number, delta: number): number => {
  return Math.max(MIN_VALUE, value + delta)
}

export const canDecrease = (value: number): boolean => {
  return value > MIN_VALUE
}
