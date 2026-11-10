import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMERA_ORDER, cameraOrderSql } from './cameraOrder.ts'

test('l’ordre d’arrivée des caméras : quatre caméras connues', () => {
  assert.deepEqual(CAMERA_ORDER, ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit'])
})

test('cameraOrderSql : une clause CASE sur la colonne, les inconnues après, puis la colonne', () => {
  assert.equal(
    cameraOrderSql(),
    "CASE camera WHEN 'voliere-interieur' THEN 0 WHEN 'voliere-exterieur' THEN 1 WHEN 'salon-de-jardin' THEN 2 WHEN 'voliere-toit' THEN 3 ELSE 4 END, camera",
  )
  assert.ok(cameraOrderSql('l.camera').startsWith('CASE l.camera WHEN'))
  assert.ok(cameraOrderSql('l.camera').endsWith('ELSE 4 END, l.camera'))
})
