// Les fichiers du disque backup (clips, images), envoyés par leur chemin relatif, jamais hors du disque.
import { resolve, sep } from 'node:path'
import type { Response } from 'express'

export const createBackupFiles = (dataDir: string) => ({
  /** Envoie un fichier du disque (avec la reprise partielle, pour la vidéo), ou 404. */
  send: (res: Response, relativePath: string, contentType: string): void => {
    const file = resolve(dataDir, relativePath)
    if (!file.startsWith(dataDir + sep)) {
      res.status(404).json({ error: 'not found' })
      return
    }
    res.sendFile(file, { headers: { 'Content-Type': contentType } }, (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'not found' })
    })
  },
})

export type BackupFiles = ReturnType<typeof createBackupFiles>
