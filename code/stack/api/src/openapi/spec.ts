// Construit le document OpenAPI 3 de l'API à partir de la liste des routes (routes.ts).
import { SESSION_COOKIE } from '../middleware/session.ts'
import { ROUTES } from './routes.ts'
import type { Group, OpenApiDocument, Operation, Parameter, ResponseObject, RouteDoc, Schema } from './types.ts'

export const KEY_HEADER_NAME = 'X-House-Key'

const TAGS: Record<Group, string> = {
  Général: 'Bienvenue, clé et session, certificat, ce document',
  Caméra: 'Direct, événements, clips, images, PoE, zones, repères, enregistrement à la main',
  Plan: 'Le plan de la maison',
  Lumière: 'Pont Philips Hue : pièces, lampes, détecteurs, extinction en douceur',
  Volet: 'Volets roulants Somfy RTS (ESP32)',
  Prise: 'Prise Kasa du chauffage, règle automatique et journal',
  Clim: 'Climatisations Mitsubishi',
  Box: 'Freebox',
  TV: 'Télécommande du Freebox Player',
}

const ERRORS: Record<number, string> = {
  400: 'Requête ou corps invalide.',
  401: 'Clé absente ou fausse (en-tête X-House-Key), et pas de session.',
  404: 'Introuvable.',
  405: 'Méthode non permise.',
  409: 'Impossible dans l’état actuel.',
  429: 'Trop d’essais de clé depuis cette adresse (10 en 15 minutes).',
  502: 'L’équipement ou le service relayé ne répond pas.',
  503: 'Non configuré (variable d’environnement absente) ou base pas prête.',
}

const ERROR_SCHEMA = '#/components/schemas/Error'

/** Les `{paramètres}` d'un chemin, dans l'ordre. */
export const pathParams = (path: string): string[] => [...path.matchAll(/\{(\w+)\}/g)].map((match) => String(match[1]))

const operationId = (route: RouteDoc): string =>
  route.method +
  route.path
    .split(/[/{}.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const parameters = (route: RouteDoc): Parameter[] => [
  ...pathParams(route.path).map((name): Parameter => ({ name, in: 'path', required: true, description: route.params?.[name] ?? 'Identifiant', schema: { type: 'string' } })),
  ...(route.query ?? []).map((query): Parameter => ({ name: query.name, in: 'query', required: query.required ?? false, description: query.description, schema: query.schema, ...(query.example === undefined ? {} : { example: query.example }) })),
]

const successOf = (route: RouteDoc): ResponseObject => {
  const { description, contentType = 'application/json', example, headers } = route.ok
  const binary = contentType !== 'application/json' && contentType !== 'text/html'
  const schema: Schema | undefined = binary ? { type: 'string', format: 'binary' } : undefined
  return {
    description,
    content: { [contentType]: { ...(schema ? { schema } : {}), ...(example === undefined ? {} : { example }) } },
    ...(headers ? { headers: Object.fromEntries(Object.entries(headers).map(([name, text]) => [name, { description: text, schema: { type: 'string' } }])) } : {}),
  }
}

const errorResponse = (status: number): ResponseObject => ({
  description: ERRORS[status] ?? 'Erreur.',
  content: { 'application/json': { schema: { $ref: ERROR_SCHEMA } as Schema, example: { error: 'message' } } },
})

export const operationOf = (route: RouteDoc): Operation => {
  const errors = [...new Set([...(route.errors ?? []), ...(route.secured ? [401, 429] : [])])].sort((a, b) => a - b)
  const params = parameters(route)
  return {
    tags: [route.group],
    summary: route.summary,
    ...(route.description ? { description: route.description } : {}),
    operationId: operationId(route),
    ...(params.length > 0 ? { parameters: params } : {}),
    ...(route.body
      ? { requestBody: { required: route.body.required ?? true, description: route.body.description, content: { 'application/json': { schema: route.body.schema, example: route.body.example } } } }
      : {}),
    responses: { [String(route.ok.status ?? 200)]: successOf(route), ...Object.fromEntries(errors.map((status) => [String(status), errorResponse(status)])) },
    ...(route.secured ? {} : { security: [] }),
  }
}

export const buildSpec = (routes: RouteDoc[] = ROUTES): OpenApiDocument => {
  const paths: OpenApiDocument['paths'] = {}
  for (const route of routes) {
    const entry = (paths[route.path] ??= {})
    entry[route.method] = operationOf(route)
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'House API',
      version: '0.1.0',
      description: `L'API de la maison (caméras, lumières, volets, prises, clim, box). Toutes les routes, sauf celles marquées publiques, exigent l'en-tête ${KEY_HEADER_NAME} ou le cookie de session ouvert par GET /auth. Bouton « Authorize » : saisir la clé.`,
    },
    tags: (Object.keys(TAGS) as Group[]).map((name) => ({ name, description: TAGS[name] })),
    security: [{ houseKey: [] }, { houseSession: [] }],
    paths,
    components: {
      securitySchemes: {
        houseKey: { type: 'apiKey', in: 'header', name: KEY_HEADER_NAME, description: 'La clé secrète de la maison.' },
        houseSession: { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE, description: 'La session ouverte par GET /auth (cookie HttpOnly, posé par le navigateur).' },
      },
      schemas: { Error: { type: 'object', properties: { error: { type: 'string' } }, required: ['error'] } },
    },
  }
}
