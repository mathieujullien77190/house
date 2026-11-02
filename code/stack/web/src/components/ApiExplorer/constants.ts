import type { ApiService } from '@house/ui'

export const SERVICES: ApiService[] = [
  { path: '/welcome', description: 'Le service de bienvenue : l’API est là. Sans clé.', secured: false },
  { path: '/auth', description: 'Vérifie la clé : ok si elle est bonne, 401 sinon.', secured: true },
  { path: '/direct', description: 'L’adresse de la page du direct de chaque caméra (go2rtc).', secured: true },
  { path: '/image', description: 'L’adresse de la dernière image de chaque caméra.', secured: true },
  { path: '/events?last=1', description: 'Le dernier événement de chaque caméra.', secured: true },
  { path: '/events?camera=portail&from=0', description: 'Les événements d’une caméra qui touchent une fenêtre (from et to en secondes ; 1000 au plus, limit pour moins) : toute l’histoire, pas seulement les 200 derniers.', secured: true },
  { path: '/events', description: 'Les 200 derniers événements, du plus récent au plus ancien.', secured: true },
  { path: '/poe', description: 'L’alimentation de chaque caméra, lue sur le switch (PoE activé, puissance). 503 sans switch configuré.', secured: true },
  { path: '/snapshots?camera=portail', description: 'Les instants où House Sync a gardé une image de la caméra (une par minute).', secured: true },
]

export const CLIPS_NOTE =
  'Pas de JSON, voir l’onglet Caméras : /clips/<id> (la vidéo d’un événement, mp4), /snapshot?camera=…&at=… (l’image la plus proche d’un instant, jpeg), /stream?camera=… (le direct, MJPEG relayé depuis go2rtc, accepte la session) et /frame?camera=… (l’image à l’instant) ; POST /poe/<caméra> avec {"on": false} coupe le PoE du port de la caméra, {"on": true} le rend.'
