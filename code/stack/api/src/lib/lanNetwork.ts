// Le filtre « réseau local » de la page invité du réseau : on ne regarde que l'adresse de la connexion TCP (jamais X-Forwarded-For, qu'un client peut écrire).
// Sont locales : les adresses IPv4 privées (10/8, 172.16/12, 192.168/16) et de bouclage, leurs formes IPv6 (::ffff:a.b.c.d), les adresses IPv6 de lien local (fe80::/10),
// uniques locales (fc00::/7), le bouclage ::1, et celles qui partagent le préfixe (/64) du réseau de la maison (LAN_IPV6_PREFIXES : la Freebox donne une adresse publique à chaque machine).

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

const isPrivateIpv4 = (address: string): boolean => {
  const match = IPV4.exec(address)
  if (!match) return false
  const [a, b] = [Number(match[1]), Number(match[2])]
  if (match.slice(1).some((part) => Number(part) > 255)) return false
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

/** Les huit groupes de 16 bits d'une adresse IPv6 (« :: » déplié) ; null si elle est fausse. */
export const expandIpv6 = (address: string): number[] | null => {
  const text = address.split('%')[0]
  if (!text.includes(':')) return null
  const halves = text.split('::')
  if (halves.length > 2) return null
  const parse = (part: string): number[] | null => {
    if (part === '') return []
    const groups = part.split(':').map((group) => (/^[0-9a-fA-F]{1,4}$/.test(group) ? parseInt(group, 16) : Number.NaN))
    return groups.some(Number.isNaN) ? null : groups
  }
  const head = parse(halves[0])
  const tail = halves.length === 2 ? parse(halves[1]) : []
  if (!head || !tail) return null
  if (halves.length === 1) return head.length === 8 ? head : null
  const fill = 8 - head.length - tail.length
  return fill < 1 ? null : [...head, ...new Array<number>(fill).fill(0), ...tail]
}

/** Les quatre premiers groupes d'un préfixe « 2a01:e0a:a16:58d0::/64 » (un /64 : l'adresse du réseau) ; null s'il est faux. */
export const parsePrefix = (prefix: string): number[] | null => {
  const [address, length] = prefix.trim().split('/')
  if (length !== undefined && length !== '64') return null
  const groups = expandIpv6(address)
  return groups ? groups.slice(0, 4) : null
}

export const isLocalAddress = (address: string | undefined, prefixes: string[] = []): boolean => {
  if (!address) return false
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address)
  if (mapped) return isPrivateIpv4(mapped[1])
  if (isPrivateIpv4(address)) return true
  const groups = expandIpv6(address)
  if (!groups) return false
  const first = groups[0]
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) return true
  if ((first & 0xffc0) === 0xfe80 || (first & 0xfe00) === 0xfc00) return true
  return prefixes.some((prefix) => {
    const wanted = parsePrefix(prefix)
    return wanted !== null && wanted.every((group, index) => group === groups[index])
  })
}
