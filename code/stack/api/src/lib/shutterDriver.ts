// Le pilote des volets roulants : ce qui envoie vraiment un ordre radio. Deux pilotes :
//  - `createMockDriver` : SIMULATION. Rien n'est envoyé, l'ordre est seulement noté. C'est le pilote par défaut, tant que SHUTTERS_ESP_URL est absent
//    (aucun matériel n'est encore branché) : toute la chaîne (WebApp, API, journal, House Sync) marche et se teste sans radio.
//  - `createEspSomfyDriver` : le VRAI pilote, à ajuster avec le matériel. L'ESP32 + CC1101 fait tourner le firmware ESPSomfy-RTS (voir l'onglet
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
 * TODO (à ajuster avec le matériel, rien de ceci n'a pu être vérifié sans l'ESP32) :
 *  1. L'adresse : SHUTTERS_ESP_URL, par exemple http://192.168.1.60 (l'IP de l'ESP32 sur la box, à fixer par un bail DHCP).
 *  2. Le chemin et le corps de la commande. D'après la documentation du firmware ESPSomfy-RTS, une commande de volet est une requête
 *     `PUT /shadeCommand` avec un corps JSON `{"shadeId": 1, "command": "up"}` ; c'est ce qui est écrit ci-dessous. À CONFIRMER dans la page web
 *     du firmware (onglet « API » / « Swagger ») ou avec `curl -X PUT http://<esp>/shadeCommand -H 'Content-Type: application/json' -d '{"shadeId":1,"command":"up"}'`.
 *  3. L'authentification : si l'accès de l'ESP32 est protégé par un mot de passe, ajouter l'en-tête ici (SHUTTERS_ESP_TOKEN, non géré pour l'instant).
 *  4. L'arrêt : « stop » est envoyé comme « my » (sur un moteur RTS en mouvement, la touche My l'arrête). À vérifier sur un vrai volet.
 *  5. Le numéro de chaque volet (`shadeId`) est celui créé dans le firmware au moment de l'appairage (bouton PROG de la télécommande existante).
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
