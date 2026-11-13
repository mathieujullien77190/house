// /openapi.json (le document) et /docs (Swagger UI). Les fichiers de Swagger UI viennent du paquet swagger-ui-dist,
// servis par l'API elle-même : aucune ressource externe. Les deux chemins sont derrière la clé (SECURED_PATHS).
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import express, { Router } from 'express'
import { buildSpec } from './spec.ts'

export const distDirectory = (): string => dirname(createRequire(import.meta.url).resolve('swagger-ui-dist/package.json'))

export const PAGE = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>House API</title>
    <link rel="stylesheet" href="/docs/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui', deepLinking: true, persistAuthorization: true })
    </script>
  </body>
</html>
`

export const docsRouter = (dist: string = distDirectory()): Router => {
  const router = Router()
  const spec = buildSpec()
  router.get('/openapi.json', (_req, res) => {
    res.json(spec)
  })
  router.get('/docs', (_req, res) => {
    res.type('html').send(PAGE)
  })
  router.use('/docs', express.static(dist, { index: false, dotfiles: 'ignore' }))
  return router
}
