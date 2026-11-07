// L'arrêt de l'enregistreur : les ffmpeg lancés sont suivis ici, et un seul gestionnaire de signal (SIGTERM, SIGINT) les arrête
// puis quitte. Les boucles qui relancent ffmpeg regardent `isStopping` pour ne pas en relancer pendant l'arrêt.
import type { ChildProcess } from 'node:child_process'

const children = new Set<ChildProcess>()
let stopping = false

/** Vrai dès qu'un signal d'arrêt est reçu. */
export const isStopping = (): boolean => stopping

/** Suit un processus ffmpeg jusqu'à sa fin : il sera arrêté avec l'enregistreur. */
export const track = (child: ChildProcess): void => {
  children.add(child)
  child.once('close', () => children.delete(child))
}

const GRACE_MS = 1000
const stop = () => {
  stopping = true
  for (const child of children) child.kill()
  // Le temps pour ffmpeg de finir proprement son segment, puis on quitte.
  setTimeout(() => process.exit(0), GRACE_MS).unref()
  if (children.size === 0) process.exit(0)
}
process.once('SIGTERM', stop)
process.once('SIGINT', stop)
