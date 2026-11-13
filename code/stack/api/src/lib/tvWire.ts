// Le minimum de protobuf pour le protocole Android TV Remote v2 : varints, champs (entier ou octets), lecture d'un message, trames précédées de leur longueur.
// Pas de bibliothèque : les messages (voir tvMessages.ts) ne comptent que quelques champs.

/** Un message protobuf illisible ou trop gros. */
export class TvWireError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TvWireError'
  }
}

/** Au-delà, une trame est refusée (les messages du protocole font quelques dizaines d'octets). */
const MAX_FRAME = 64 * 1024

export const encodeVarint = (value: number): Buffer => {
  const bytes: number[] = []
  let rest = value
  while (rest >= 0x80) {
    bytes.push((rest % 0x80) | 0x80)
    rest = Math.floor(rest / 0x80)
  }
  bytes.push(rest)
  return Buffer.from(bytes)
}

/** Un champ entier (type 0). */
export const varintField = (field: number, value: number): Buffer => Buffer.concat([encodeVarint(field * 8), encodeVarint(value)])

/** Un champ à longueur variable (type 2) : octets, texte ou sous-message. */
export const bytesField = (field: number, data: Buffer | string): Buffer => {
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data
  return Buffer.concat([encodeVarint(field * 8 + 2), encodeVarint(bytes.length), bytes])
}

export interface WireField {
  field: number
  /** Un entier (type 0) ou les octets d'un champ à longueur variable (type 2). */
  value: number | Buffer
}

const readVarint = (data: Buffer, start: number): { value: number; next: number } => {
  let value = 0
  let factor = 1
  let offset = start
  for (let count = 0; count < 8; count++) {
    if (offset >= data.length) throw new TvWireError('truncated varint')
    const byte = data[offset++]
    value += (byte & 0x7f) * factor
    if (byte < 0x80) return { value, next: offset }
    factor *= 0x80
  }
  throw new TvWireError('varint too long')
}

/** Les champs d'un message, dans l'ordre. Les types 1 et 5 (nombres fixes) sont sautés. */
export const parseFields = (data: Buffer): WireField[] => {
  const fields: WireField[] = []
  let offset = 0
  while (offset < data.length) {
    const tag = readVarint(data, offset)
    offset = tag.next
    const field = Math.floor(tag.value / 8)
    const type = tag.value % 8
    if (type === 0) {
      const varint = readVarint(data, offset)
      offset = varint.next
      fields.push({ field, value: varint.value })
    } else if (type === 2) {
      const length = readVarint(data, offset)
      offset = length.next
      if (offset + length.value > data.length) throw new TvWireError('truncated field')
      fields.push({ field, value: data.subarray(offset, offset + length.value) })
      offset += length.value
    } else if (type === 1 || type === 5) {
      offset += type === 1 ? 8 : 4
      if (offset > data.length) throw new TvWireError('truncated field')
    } else {
      throw new TvWireError('unsupported wire type')
    }
  }
  return fields
}

/** Le premier champ de ce numéro, ou undefined. */
export const findField = (fields: WireField[], field: number): number | Buffer | undefined => fields.find((item) => item.field === field)?.value

/** Une trame : la longueur du message en varint, puis le message. */
export const frame = (message: Buffer): Buffer => Buffer.concat([encodeVarint(message.length), message])

/** Recolle les morceaux reçus et rend chaque message complet à `onMessage`. Une trame trop grosse lève TvWireError. */
export const createFrameReader = (onMessage: (message: Buffer) => void): ((chunk: Buffer) => void) => {
  let pending = Buffer.alloc(0)
  return (chunk) => {
    pending = Buffer.concat([pending, chunk])
    for (;;) {
      let length: { value: number; next: number }
      try {
        length = readVarint(pending, 0)
      } catch {
        return
      }
      if (length.value > MAX_FRAME) throw new TvWireError('frame too large')
      if (pending.length < length.next + length.value) return
      const message = pending.subarray(length.next, length.next + length.value)
      pending = pending.subarray(length.next + length.value)
      onMessage(message)
    }
  }
}
