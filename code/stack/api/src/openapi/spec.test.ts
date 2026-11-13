import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ROUTES } from './routes.ts'
import { buildSpec, operationOf, pathParams } from './spec.ts'
import type { RouteDoc } from './types.ts'

const route = (over: Partial<RouteDoc>): RouteDoc => ({ method: 'get', path: '/x', group: 'Général', summary: 's', secured: true, ok: { description: 'ok' }, ...over })

test('pathParams : les paramètres du chemin dans l’ordre', () => {
  assert.deepEqual(pathParams('/a/{id}/b/{camera}'), ['id', 'camera'])
  assert.deepEqual(pathParams('/a'), [])
})

test('le document décrit chaque route, sa sécurité et ses groupes', () => {
  const spec = buildSpec()
  assert.equal(spec.openapi, '3.0.3')
  assert.deepEqual(Object.keys(spec.components.securitySchemes), ['houseKey', 'houseSession'])
  assert.equal(spec.components.securitySchemes.houseKey?.name, 'X-House-Key')
  assert.equal(spec.components.securitySchemes.houseSession?.in, 'cookie')
  const tags = spec.tags.map((tag) => tag.name)
  for (const doc of ROUTES) {
    const operation = spec.paths[doc.path]?.[doc.method]
    assert.ok(operation, `${doc.method} ${doc.path}`)
    assert.ok(tags.includes(operation.tags[0] ?? ''))
    assert.equal(operation.security === undefined, doc.secured)
  }
  assert.equal(new Set(ROUTES.map((doc) => `${doc.method} ${doc.path}`)).size, ROUTES.length, 'une route est décrite une fois')
  const ids = Object.values(spec.paths).flatMap((entry) => Object.values(entry).map((operation) => operation.operationId))
  assert.equal(new Set(ids).size, ids.length, 'operationId uniques')
})

test('une opération : paramètres, corps, succès binaire, erreurs', () => {
  const operation = operationOf(
    route({
      method: 'put',
      path: '/clips/{id}/saved',
      description: 'détail',
      params: { id: 'L’événement' },
      query: [
        { name: 'a', description: 'A', schema: { type: 'string' }, example: 'x' },
        { name: 'b', description: 'B', required: true, schema: { type: 'number' } },
      ],
      body: { description: 'd', schema: { type: 'object' }, example: { saved: true }, required: false },
      ok: { status: 202, description: 'ok', contentType: 'video/mp4', headers: { 'X-Test': 'un en-tête' } },
      errors: [404, 400, 404],
    }),
  )
  assert.equal(operation.operationId, 'putClipsIdSaved')
  assert.equal(operation.description, 'détail')
  assert.deepEqual(
    operation.parameters?.map((p) => [p.name, p.in, p.required, p.description]),
    [
      ['id', 'path', true, 'L’événement'],
      ['a', 'query', false, 'A'],
      ['b', 'query', true, 'B'],
    ],
  )
  assert.equal(operation.parameters?.[1]?.example, 'x')
  assert.equal(operation.requestBody?.required, false)
  assert.deepEqual(Object.keys(operation.responses), ['202', '400', '401', '404', '429'])
  assert.deepEqual(operation.responses['202']?.content?.['video/mp4']?.schema, { type: 'string', format: 'binary' })
  assert.equal(operation.responses['202']?.headers?.['X-Test']?.description, 'un en-tête')
})

test('une opération minimale : publique, JSON, paramètre sans description, code inconnu', () => {
  const operation = operationOf(route({ secured: false, path: '/y/{n}', errors: [418], ok: { description: 'ok', example: { a: 1 } } }))
  assert.deepEqual(operation.security, [])
  assert.equal(operation.parameters?.[0]?.description, 'Identifiant')
  assert.equal(operation.requestBody, undefined)
  assert.deepEqual(operation.responses['200']?.content?.['application/json']?.example, { a: 1 })
  assert.equal(operation.responses['418']?.description, 'Erreur.')
  assert.deepEqual(Object.keys(operation.responses), ['200', '418'])
  assert.equal(operationOf(route({ path: '/', ok: { description: 'h', contentType: 'text/html' } })).responses['200']?.content?.['text/html']?.schema, undefined)
})

test('buildSpec regroupe les méthodes d’un même chemin', () => {
  const spec = buildSpec([route({ path: '/z' }), route({ path: '/z', method: 'post' })])
  assert.deepEqual(Object.keys(spec.paths['/z'] ?? {}), ['get', 'post'])
})
