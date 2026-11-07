import type { ApiService } from '@house/ui'

export const SERVICES: ApiService[] = [
  { path: '/welcome', description: 'Le service de bienvenue : l’API est là. Sans clé.', secured: false, group: 'Général' },
  { path: '/auth', description: 'Vérifie la clé : ok si elle est bonne, 401 sinon.', secured: true, group: 'Général' },
  { path: '/direct', description: 'L’adresse de la page du direct de chaque caméra (go2rtc).', secured: true, group: 'Caméra' },
  { path: '/image', description: 'L’adresse de la dernière image de chaque caméra.', secured: true, group: 'Caméra' },
  { path: '/events?last=1', description: 'Le dernier événement de chaque caméra.', secured: true, group: 'Caméra' },
  { path: '/events?camera=perruche-fond&from=0', description: 'Les événements d’une caméra qui touchent une fenêtre (from et to en secondes ; 1000 au plus, limit pour moins) : toute l’histoire, pas seulement les 200 derniers.', secured: true, group: 'Caméra' },
  { path: '/events', description: 'Les 200 derniers événements, du plus récent au plus ancien.', secured: true, group: 'Caméra' },
  { path: '/poe', description: 'L’alimentation de chaque caméra, lue sur le switch (PoE activé, puissance). 503 sans switch configuré.', secured: true, group: 'Caméra' },
  { path: '/snapshots?camera=perruche-fond', description: 'Les instants où House Sync a gardé une image de la caméra (une par minute par défaut).', secured: true, group: 'Caméra' },
  { path: '/lamp-history?name=Lampe%20cage%20perruche', description: 'Les plages où la lampe de la volière était allumée (from, to, open si elle l’est encore), d’après le journal de House Sync.', secured: true, group: 'Lumière' },
  { path: '/hue', description: 'Les pièces du pont Philips Hue et leurs lampes (état, luminosité). PUT /hue/rooms/<id> ou /hue/lights/<id> avec {"on": true} et/ou {"bri": 1 à 254} les change. 503 sans pont configuré.', secured: true, group: 'Lumière' },
  { path: '/hue/automations', description: 'Les règles d’automatisation du pont Hue en phrases : les horaires (quand, où, quoi) et les détecteurs de mouvement. 503 sans pont configuré.', secured: true, group: 'Lumière' },
  { path: '/hue/sensors', description: 'Les détecteurs de mouvement du pont Hue, avec leur température et leur luminosité. 503 sans pont configuré.', secured: true, group: 'Lumière' },
  { path: '/plug', description: 'La prise connectée TP-Link Kasa (« chauffage ») : nom, allumée ou non, signal WiFi, depuis quand. POST /plug avec {"on": true|false} l\'allume ou l\'éteint. 502 si elle ne répond pas, 503 sans prise configurée.', secured: true, group: 'Prise' },
]

