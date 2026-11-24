import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMERA_ORDER, cameraOrderSql, compareCameras } from './cameraOrder.ts'

test('l’ordre d’arrivée des caméras : huit caméras connues', () => {
  assert.deepEqual(CAMERA_ORDER, ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit', 'potager', 'cerisier', 'pommier', 'portail'])
})

test('compareCameras : les connues dans l’ordre d’arrivée, puis les autres par ordre alphabétique', () => {
  const sorted = ['zebre', 'voliere-toit', 'abeille', 'salon-de-jardin', 'voliere-exterieur', 'voliere-interieur'].sort(compareCameras)
  assert.deepEqual(sorted, ['voliere-interieur', 'voliere-exterieur', 'salon-de-jardin', 'voliere-toit', 'abeille', 'zebre'])
  assert.equal(compareCameras('a', 'a'), 0)
})

test('cameraOrderSql : une clause CASE sur la colonne, les inconnues après, puis la colonne', () => {
  assert.equal(
    cameraOrderSql(),
    "CASE camera WHEN 'voliere-interieur' THEN 0 WHEN 'voliere-exterieur' THEN 1 WHEN 'salon-de-jardin' THEN 2 WHEN 'voliere-toit' THEN 3 WHEN 'potager' THEN 4 WHEN 'cerisier' THEN 5 WHEN 'pommier' THEN 6 WHEN 'portail' THEN 7 ELSE 8 END, camera",
  )
  assert.ok(cameraOrderSql('l.camera').endsWith('ELSE 8 END, l.camera'))
})
