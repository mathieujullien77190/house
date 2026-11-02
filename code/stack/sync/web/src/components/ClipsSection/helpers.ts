import { VERSION_H264, VERSION_ORIGINAL } from './constants'

/** La version d'un clip d'après son nom : la copie légère finit par .h264.mp4, l'original par .mp4. */
export const versionOf = (path: string): string => (path.endsWith('.h264.mp4') ? VERSION_H264 : VERSION_ORIGINAL)
