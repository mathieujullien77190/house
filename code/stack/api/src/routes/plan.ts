// plan : le plan de la maison (arbres, haies, cage, portes, caméras du plan et leur lien avec les vraies caméras). GET /plan rend le document gardé (ou {"plan": null} s'il n'y en
// a pas encore) ; PUT /plan le remplace (corps : le document, 128 ko au plus).
import express, { Router } from 'express'
import type { PlanStore } from '../lib/planStore.ts'

export const planRouter = (plan: PlanStore): Router => {
  const router = Router()
  router.get('/plan', (_req, res) => {
    res.json({ plan: plan.get() })
  })
  router.put('/plan', express.json({ limit: '128kb' }), (req, res, next) => {
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body))
      return void res.status(400).json({ error: 'body must be a plan document' })
    try {
      res.json({ plan: plan.set(req.body) })
    } catch (error) {
      next(error)
    }
  })
  return router
}
