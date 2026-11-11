// Le pilote des volets roulants : ce qui envoie vraiment un ordre radio. Deux pilotes :
//  - `createMockDriver` : SIMULATION. Rien n'est envoyé, l'ordre est seulement noté. C'est le pilote par défaut, tant que SHUTTERS_ESP_URL est absent
//    (aucun matériel n'est encore branché) : toute la chaîne (WebApp, API, journal, House Sync) marche et se teste sans radio.
//  - `createEspSomfyDriver` : le VRAI pilote. L'ESP32 + CC1101 fait tourner le firmware ESPSomfy-RTS (voir l'onglet
//    Architecture du site, vue « Volet ») ; ce pilote lui parle en HTTP par le Wi-Fi de la maison.
// Le Somfy RTS est à SENS UNIQUE : l'ordre part, aucune réponse ne dit si le volet a bougé ni où il est.

/** Les trois ordres de la WebApp. Le firmware, lui, connaît « up », « down » et « my » (arrêt / position favorite). */
export type ShutterCommand = 'up' | 'down' | 'stop'

export const SHUTTER_COMMANDS: readonly ShutterCommand[] = ['up', 'down', 'stop']

export interface ShutterDriver {
  /** Vrai pour la simulation : la WebApp l'écrit à l'écran pour qu'on ne croie pas qu'un volet a bougé. */
  mock: boolean
  /** Envoie l'ordre au volet `shadeId` (le numéro du volet dans le firmware) ; lève une erreur si l'ESP32 ne répond pas ou refuse. */
  send: (shadeId: number, command: ShutterCommand) => Promise<void>
}

/** Une simulation : garde les ordres reçus (pour les essais et le débogage). */
export const createMockDriver = (): ShutterDriver & { sent: { shadeId: number; command: ShutterCommand }[] } => {
  const sent: { shadeId: number; command: ShutterCommand }[] = []
  return {
    mock: true,
    sent,
    send: async (shadeId, command) => {
      sent.push({ shadeId, command })
    },
  }
}

/** Le délai maximum d'une requête vers l'ESP32 : il est en Wi-Fi 2,4 GHz, parfois lent, mais jamais plus de quelques secondes. */
const TIMEOUT_MS = 5000

/**
 * Le pilote ESPSomfy-RTS.
 *
 * Vérifié avec le matériel (volet cuisine, depuis le 9 novembre 2026) : `PUT /shadeCommand` avec `{"shadeId": 1, "command": "up"}` marche, sans authentification ;
 * « stop » part comme « my » (la touche My arrête un moteur RTS en mouvement). L'adresse est SHUTTERS_ESP_URL (bail DHCP réservé dans la Freebox) et le `shadeId` est
 * le numéro créé dans le firmware à l'appairage (bouton PROG de la télécommande). Pas de SHUTTERS_ESP_TOKEN : l'ESP32 n'est pas protégé par un mot de passe.
 */
export const createEspSomfyDriver = (baseUrl: string, fetcher: typeof fetch = fetch): ShutterDriver => ({
  mock: false,
  send: async (shadeId, command) => {
    const response = await fetcher(`${baseUrl.replace(/\/+$/, '')}/shadeCommand`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shadeId, command: command === 'stop' ? 'my' : command }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`ESP32 : HTTP ${response.status}`)
  },
})
