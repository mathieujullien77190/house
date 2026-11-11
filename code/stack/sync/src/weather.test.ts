// Tests de la météo : le niveau de pluie d'après le code et le cumul, et la lecture périodique.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { testContext } from './testing.ts'
import { createWeather, rainLevelOf, weatherUrl } from './weather.ts'

test('rainLevelOf : aucune pluie, pluie, pluie forte (code météo et cumul de l’heure)', () => {
  assert.equal(rainLevelOf(0, 0), 'none')
  assert.equal(rainLevelOf(3, 0), 'none')
  assert.equal(rainLevelOf(71, 0), 'none')
  // brouillard : les deux codes, même sans cumul
  assert.equal(rainLevelOf(45, 0), 'fog')
  assert.equal(rainLevelOf(48, 0), 'fog')
  // la pluie faible ne compte pas : bruine, pluie faible, averses faibles, pluie verglaçante faible
  assert.equal(rainLevelOf(61, 0.4), 'none')
  assert.equal(rainLevelOf(55, 0), 'none')
  assert.equal(rainLevelOf(51, 0), 'none')
  assert.equal(rainLevelOf(80, 0), 'none')
  assert.equal(rainLevelOf(66, 0), 'none')
  assert.equal(rainLevelOf(81, 0), 'rain')
  assert.equal(rainLevelOf(65, 0), 'heavy')
  assert.equal(rainLevelOf(67, 0), 'heavy')
  assert.equal(rainLevelOf(82, 0), 'heavy')
  assert.equal(rainLevelOf(95, 0), 'heavy')
  assert.equal(rainLevelOf(99, 0), 'heavy')
  assert.equal(rainLevelOf(63, 0), 'rain')
  // le cumul fait une pluie normale à partir de 2,5 mm, jamais une pluie forte : seul le code le dit
  assert.equal(rainLevelOf(3, 0.1), 'none')
  assert.equal(rainLevelOf(3, 2.4), 'none')
  assert.equal(rainLevelOf(3, 2.5), 'rain')
  assert.equal(rainLevelOf(3, 8), 'rain')
  assert.equal(rainLevelOf(61, 4), 'rain')
})

test('weatherUrl : la position de la maison, le code météo et le cumul', () => {
  assert.equal(weatherUrl(48.6, 2.7), 'https://api.open-meteo.com/v1/forecast?latitude=48.6&longitude=2.7&current=weather_code,precipitation&timezone=auto')
})

test('poll : le niveau va aux réglages, et un changement est noté une fois', async () => {
  let body: unknown = { current: { weather_code: 63, precipitation: 3 } }
  const ctx = testContext(() => Response.json(body))
  ctx.settings.saveCameraSettings({ camera: 'cam', mode: 'always', fps: 25, light: 25, fpsMobile: 25, lightMobile: 25, sensitivity: 3, seconds: 60, orientation: 'landscape', rain: 'on' })
  const weather = createWeather(ctx)
  assert.equal(await weather.poll(), 'rain')
  assert.match(ctx.calls[0].url, /^https:\/\/api\.open-meteo\.com\//)
  assert.equal(ctx.settings.cameraSettings('cam').rain_now, 'rain')
  assert.deepEqual(ctx.logs, ['Météo : pluie'])
  assert.equal(await weather.poll(), 'rain')
  assert.deepEqual(ctx.logs, ['Météo : pluie'])
  // sans cumul lisible, seul le code compte ; un orage est une pluie forte
  body = { current: { weather_code: 95 } }
  assert.equal(await weather.poll(), 'heavy')
  assert.equal(ctx.settings.cameraSettings('cam').rain_now, 'heavy')
  body = { current: { weather_code: 3, precipitation: 0 } }
  assert.equal(await weather.poll(), 'none')
  assert.deepEqual(ctx.logs, ['Météo : pluie', 'Météo : pluie forte', 'Météo : plus de pluie'])
  assert.equal(ctx.settings.cameraSettings('cam').rain_now, 'off')
})

test('poll : une lecture qui échoue garde le dernier niveau et le dit', async () => {
  let answer: () => Response = () => Response.json({ current: { weather_code: 65 } })
  const ctx = testContext(() => answer())
  const weather = createWeather(ctx)
  assert.equal(await weather.poll(), 'heavy')
  answer = () => new Response('', { status: 500 })
  assert.equal(await weather.poll(), 'heavy')
  answer = () => Response.json({})
  assert.equal(await weather.poll(), 'heavy')
  answer = () => Response.json({ current: { weather_code: 'beau' } })
  assert.equal(await weather.poll(), 'heavy')
  answer = () => {
    throw new Error('réseau coupé')
  }
  assert.equal(await weather.poll(), 'heavy')
  assert.deepEqual(ctx.logs, ['Météo : pluie forte', 'Météo : HTTP 500', 'Météo : réponse inattendue', 'Météo : réponse inattendue', 'Météo : réseau coupé'])
})
