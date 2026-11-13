export interface GlossaryEntry {
  id: string
  /** Terme affiché dans le titre du bloc. */
  term: string
  definition: string
  /** Écritures reconnues dans les textes (insensible à la casse). */
  match: string[]
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'poe',
    term: 'PoE (Power over Ethernet)',
    definition: 'Le câble réseau transporte aussi le courant (norme 802.3af, jusqu’à 15 W par port) : une caméra n’a besoin que d’un câble RJ45, sans prise électrique à côté.',
    match: ['PoE'],
  },
  {
    id: 'rtsp',
    term: 'RTSP',
    definition: 'Real Time Streaming Protocol : protocole standard pour recevoir en direct le flux vidéo d’une caméra sur le réseau (adresse de la forme rtsp://adresse-ip/…). Le mini PC lit ce flux pour enregistrer et détecter les mouvements.',
    match: ['RTSP'],
  },
  {
    id: 'rstp',
    term: 'RSTP',
    definition: 'Rapid Spanning Tree Protocol : évite les boucles réseau quand deux switchs sont reliés par plusieurs câbles, et bascule vite sur un autre chemin si un lien tombe.',
    match: ['RSTP'],
  },
  {
    id: 'vpn',
    term: 'VPN',
    definition: 'Réseau privé virtuel : un tunnel chiffré par internet qui amène un appareil de l’extérieur (un téléphone en 4G) sur le réseau de la maison, comme s’il était branché dessus.',
    match: ['VPN'],
  },
  {
    id: 'wireguard',
    term: 'WireGuard',
    definition: 'Protocole de VPN moderne, simple et rapide. Le serveur est intégré à la Freebox : chaque appareil a sa clé (un QR code à scanner dans l’appli WireGuard) et un seul port UDP est ouvert sur la box.',
    match: ['WireGuard'],
  },
  {
    id: 'ca',
    term: 'Autorité de certification (CA)',
    definition: 'L’autorité de la maison signe le certificat HTTPS des applications. Une fois son certificat public installé sur un appareil (téléchargeable sur /rootCA.crt), le navigateur affiche le cadenas au lieu d’une alerte. Sa clé privée ne quitte jamais le mini PC.',
    match: ['CA de la maison', 'autorité de certification'],
  },
]

export const findEntry = (id: string): GlossaryEntry | undefined => GLOSSARY.find((e) => e.id === id)
