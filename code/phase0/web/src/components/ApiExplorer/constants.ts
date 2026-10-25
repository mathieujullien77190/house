import type { ApiService } from '@house/ui'

export const SERVICES: ApiService[] = [
  { path: '/welcome', description: 'Le service de bienvenue : l’API est là. Sans clé.', secured: false },
  { path: '/auth', description: 'Vérifie la clé : ok si elle est bonne, 401 sinon.', secured: true },
  { path: '/direct', description: 'L’adresse de la page du direct de chaque caméra (Frigate).', secured: true },
  { path: '/image', description: 'L’adresse de la dernière image de chaque caméra (Frigate).', secured: true },
  { path: '/events?last=1', description: 'Le dernier événement de chaque caméra.', secured: true },
  { path: '/events', description: 'Les 200 derniers événements, du plus récent au plus ancien.', secured: true },
  { path: '/snapshots?camera=portail', description: 'Les instants où House Sync a gardé une image de la caméra (une par minute).', secured: true },
]

export const CLIPS_NOTE =
  '/clips/<id> renvoie la vidéo d’un événement (mp4) et /snapshot?camera=…&at=… l’image la plus proche d’un instant (jpeg) : pas de JSON, voir l’onglet Caméras.'
