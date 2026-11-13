// Les messages du protocole Android TV Remote v2 (Google TV / Android TV), d'après les .proto publiés par tronikos/androidtvremote2 (Apache-2.0) :
// l'appairage (port 6467, « polo ») et la télécommande (port 6466). Tout est écrit à la main avec tvWire.ts.
import { bytesField, findField, parseFields, varintField } from './tvWire.ts'

/** Statut d'un message d'appairage. */
export const STATUS_OK = 200
const PROTOCOL_VERSION = 2
const SERVICE_NAME = 'atvremote'
/** Type d'encodage HEXADECIMAL (Options.Encoding) et rôle INPUT : le client saisit le code affiché par la TV. */
const ENCODING_HEXADECIMAL = 3
const ROLE_INPUT = 1
const CODE_LENGTH = 6

// --- Appairage ---

const pairingOuter = (...fields: Buffer[]): Buffer => Buffer.concat([varintField(1, PROTOCOL_VERSION), varintField(2, STATUS_OK), ...fields])
const encoding = (): Buffer => Buffer.concat([varintField(1, ENCODING_HEXADECIMAL), varintField(2, CODE_LENGTH)])

export const pairingRequest = (clientName: string): Buffer => pairingOuter(bytesField(10, Buffer.concat([bytesField(1, SERVICE_NAME), bytesField(2, clientName)])))
export const pairingOptions = (): Buffer => pairingOuter(bytesField(20, Buffer.concat([bytesField(1, encoding()), varintField(3, ROLE_INPUT)])))
export const pairingConfiguration = (): Buffer => pairingOuter(bytesField(30, Buffer.concat([bytesField(1, encoding()), varintField(2, ROLE_INPUT)])))
export const pairingSecret = (secret: Buffer): Buffer => pairingOuter(bytesField(40, bytesField(1, secret)))

export type PairingKind = 'request_ack' | 'options' | 'configuration_ack' | 'secret_ack' | 'other'

const PAIRING_KINDS: Record<number, PairingKind> = { 11: 'request_ack', 20: 'options', 31: 'configuration_ack', 41: 'secret_ack' }

/** Un message d'appairage reçu : son statut (200 = bon) et sa nature. */
export const parsePairing = (data: Buffer): { status: number; kind: PairingKind } => {
  const fields = parseFields(data)
  const status = findField(fields, 2)
  const kind = fields.map((item) => PAIRING_KINDS[item.field]).find((value) => value !== undefined)
  return { status: typeof status === 'number' ? status : 0, kind: kind ?? 'other' }
}

// --- Télécommande ---

/** Les fonctions que ce client accepte parmi celles annoncées par la TV (ping, touches, IME, voix, marche/arrêt, volume, liens d'appli). */
const FEATURES = 1 + 2 + 4 + 8 + 32 + 64 + 512
/** RemoteDirection. */
export const DIRECTION = { startLong: 1, endLong: 2, short: 3 } as const

export type RemoteIncoming =
  | { kind: 'configure'; features: number }
  | { kind: 'set_active' }
  | { kind: 'start' }
  | { kind: 'ping'; val1: number }
  | { kind: 'error' }
  | { kind: 'other' }

/** Un message de télécommande reçu. */
export const parseRemote = (data: Buffer): RemoteIncoming => {
  const first = parseFields(data)[0]
  if (!first || !Buffer.isBuffer(first.value)) return { kind: 'other' }
  if (first.field === 1) {
    const code1 = findField(parseFields(first.value), 1)
    return { kind: 'configure', features: typeof code1 === 'number' ? code1 : 0 }
  }
  if (first.field === 2) return { kind: 'set_active' }
  if (first.field === 3) return { kind: 'error' }
  if (first.field === 8) {
    const val1 = findField(parseFields(first.value), 1)
    return { kind: 'ping', val1: typeof val1 === 'number' ? val1 : 0 }
  }
  if (first.field === 40) return { kind: 'start' }
  return { kind: 'other' }
}

/** La réponse à remote_configure : seulement les fonctions que la TV annonce et que le client accepte. */
export const remoteConfigure = (supported: number): Buffer => {
  const info = Buffer.concat([bytesField(1, 'House'), bytesField(2, 'House'), varintField(3, 1), bytesField(4, '1'), bytesField(5, 'house-api'), bytesField(6, '1.0.0')])
  return bytesField(1, Buffer.concat([varintField(1, supported & FEATURES), bytesField(2, info)]))
}
export const remoteSetActive = (supported: number): Buffer => bytesField(2, varintField(1, supported & FEATURES))
export const remotePong = (val1: number): Buffer => bytesField(9, varintField(1, val1))
/** Lance une application par son lien (`RemoteAppLinkLaunchRequest`, champ 90 du message). */
export const remoteAppLink = (link: string): Buffer => bytesField(90, bytesField(1, link))
export const remoteKey = (keyCode: number, direction: number): Buffer => bytesField(10, Buffer.concat([varintField(1, keyCode), varintField(2, direction)]))
