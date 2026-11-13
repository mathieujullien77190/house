// Les types de la description de l'API : une route documentée (RouteDoc, la source) et le document OpenAPI 3 qui en sort.

export type Method = 'get' | 'post' | 'put' | 'delete'

/** Le tag (le groupe) d'une route dans Swagger UI. */
export type Group = 'Général' | 'Caméra' | 'Lumière' | 'Volet' | 'Prise' | 'Clim' | 'Box' | 'TV' | 'Plan'


/** Un morceau de JSON Schema, juste ce que le document utilise. */
export interface Schema {
  type?: 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array'
  format?: string
  $ref?: string
  description?: string
  enum?: (string | number)[]
  nullable?: boolean
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  maxLength?: number
  properties?: Record<string, Schema>
  required?: string[]
  items?: Schema
  additionalProperties?: Schema | boolean
  oneOf?: Schema[]
}

/** Un paramètre de la requête (après le « ? »). */
export interface QueryParam {
  name: string
  description: string
  required?: boolean
  schema: Schema
  example?: string | number
}

/** Le corps JSON attendu. */
export interface BodyDoc {
  description: string
  schema: Schema
  example: unknown
  /** Faux : le corps peut manquer (POST sans corps par exemple). Vrai par défaut. */
  required?: boolean
}

/** La réponse en cas de succès. */
export interface OkDoc {
  /** 200 par défaut. */
  status?: number
  description: string
  /** `application/json` par défaut. Autre type (vidéo, image, flux) : le corps est binaire. */
  contentType?: string
  /** Un exemple de corps JSON. */
  example?: unknown
  /** En-têtes de la réponse, nom puis description. */
  headers?: Record<string, string>
}

/** Une route montée de l'API, telle que Swagger la décrit. Ajouter une route à l'API, c'est ajouter une ligne ici. */
export interface RouteDoc {
  method: Method
  /** Le chemin au format OpenAPI : `/clips/{id}/saved`. */
  path: string
  group: Group
  summary: string
  description?: string
  /** Vrai : derrière la clé ou la session (doit figurer dans SECURED_PATHS). */
  secured: boolean
  /** Description de chaque `{paramètre}` du chemin (« Identifiant » sinon). */
  params?: Record<string, string>
  query?: QueryParam[]
  body?: BodyDoc
  ok: OkDoc
  /** Les codes d'erreur que la route peut rendre (400, 404, 409, 502, 503…). 401 et 429 s'ajoutent d'eux-mêmes aux routes sécurisées. */
  errors?: number[]
}

export interface MediaType {
  schema?: Schema
  example?: unknown
}

export interface Parameter {
  name: string
  in: 'path' | 'query'
  required: boolean
  description: string
  schema: Schema
  example?: string | number
}

export interface ResponseObject {
  description: string
  content?: Record<string, MediaType>
  headers?: Record<string, { description: string; schema: Schema }>
}

export interface Operation {
  tags: string[]
  summary: string
  description?: string
  operationId: string
  parameters?: Parameter[]
  requestBody?: { required: boolean; description: string; content: Record<string, MediaType> }
  responses: Record<string, ResponseObject>
  /** `[]` : route publique. Absent : la sécurité globale du document. */
  security?: Record<string, string[]>[]
}

export interface SecurityScheme {
  type: 'apiKey'
  in: 'header' | 'cookie'
  name: string
  description: string
}

export interface OpenApiDocument {
  openapi: string
  info: { title: string; version: string; description: string }
  tags: { name: string; description: string }[]
  security: Record<string, string[]>[]
  paths: Record<string, Partial<Record<Method, Operation>>>
  components: { securitySchemes: Record<string, SecurityScheme>; schemas: Record<string, Schema> }
}
