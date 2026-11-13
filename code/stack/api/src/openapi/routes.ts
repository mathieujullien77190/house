// La liste de toutes les routes montées de l'API, source du document OpenAPI (spec.ts) et de Swagger UI (/docs).
// Ajouter ou changer une route de src/routes/*.ts, c'est ajouter ou changer une ligne ici ; le test de ce dossier
// compare cette liste aux routes réellement montées et échoue si l'une manque ou n'existe plus.
import { TV_KEYS } from '../lib/tvKeys.ts'
import type { BodyDoc, QueryParam, RouteDoc, Schema } from './types.ts'

const text: Schema = { type: 'string' }
const flag: Schema = { type: 'boolean' }
const bool = (description: string): Schema => ({ type: 'boolean', description })

const CAMERA = { camera: 'Nom de la caméra (lettres, chiffres, tiret) : voliere-exterieur, voliere-interieur…' }
const CLIP = { id: 'Identifiant de l’événement (lettres, chiffres, point, tiret)' }

const cameraQuery: QueryParam = { name: 'camera', description: 'Nom de la caméra', required: true, schema: text, example: 'voliere-exterieur' }
const seconds = (name: string, description: string): QueryParam => ({ name, description, schema: { type: 'number' } })

const onBody = (description: string): BodyDoc => ({
  description,
  schema: { type: 'object', properties: { on: flag }, required: ['on'] },
  example: { on: true },
})

const LIGHT_STATE: BodyDoc = {
  description: 'L’état voulu : on et/ou bri (luminosité de 1 à 254).',
  schema: { type: 'object', properties: { on: flag, bri: { type: 'integer', minimum: 1, maximum: 254 } } },
  example: { on: true, bri: 200 },
}

export const ROUTES: RouteDoc[] = [
  // Général
  { method: 'get', path: '/welcome', group: 'Général', summary: 'Bienvenue', description: 'L’API est là. Sans clé.', secured: false, ok: { description: 'Le service et l’heure.', example: { service: 'house-api', message: 'Welcome to House API', time: '2026-11-12T08:00:00.000Z' } } },
  { method: 'get', path: '/rootCA.crt', group: 'Général', summary: 'Certificat de la CA de la maison', description: 'Le certificat PUBLIC de l’autorité de la maison, à installer sur un téléphone pour qu’il fasse confiance au HTTPS. Jamais la clé privée. Sans clé.', secured: false, ok: { description: 'Le certificat.', contentType: 'application/x-x509-ca-cert' }, errors: [404] },
  { method: 'get', path: '/auth', group: 'Général', summary: 'Vérifier la clé et ouvrir la session', description: 'La clé est bonne : ouvre la session par cookie (renouvelée à chaque appel, 30 jours).', secured: true, ok: { description: 'Clé valide.', example: { ok: true }, headers: { 'Set-Cookie': 'Le cookie de session house_session (HttpOnly, Secure).' } } },
  { method: 'get', path: '/logout', group: 'Général', summary: 'Fermer la session', description: 'Efface le cookie de session. Sans clé.', secured: false, ok: { description: 'Session fermée.', example: { ok: true } } },
  { method: 'get', path: '/openapi.json', group: 'Général', summary: 'Ce document', description: 'La description OpenAPI 3 de l’API.', secured: true, ok: { description: 'Le document OpenAPI.' } },
  { method: 'get', path: '/docs', group: 'Général', summary: 'Swagger UI', description: 'La page de documentation interactive. Se charge avec le cookie de session (ouvrir d’abord la WebApp).', secured: true, ok: { description: 'La page HTML.', contentType: 'text/html' } },

  // Caméra
  { method: 'get', path: '/direct', group: 'Caméra', summary: 'Le direct de chaque caméra', description: 'Par caméra : adresse du direct (go2rtc), orientation, pluie (rain) et recherche des yeux (eyes).', secured: true, ok: { description: 'Une entrée par caméra.' } },
  { method: 'get', path: '/image', group: 'Caméra', summary: 'La dernière image de chaque caméra', secured: true, ok: { description: 'Une adresse par caméra.' } },
  {
    method: 'get',
    path: '/events',
    group: 'Caméra',
    summary: 'Les événements de mouvement',
    description: 'Sans paramètre : les 200 derniers, du plus récent au plus ancien. Un événement porte saved, clip, clip_h264, clip_audio, clip_shapes, note, emoji, orientation.',
    secured: true,
    query: [
      { name: 'last', description: '1 : le dernier événement de chaque caméra', schema: { type: 'string', enum: ['1'] } },
      { name: 'saved', description: '1 : seulement les clips sauvegardés', schema: { type: 'string', enum: ['1'] } },
      { name: 'camera', description: 'Une seule caméra', schema: text, example: 'voliere-exterieur' },
      seconds('from', 'Début de la fenêtre (secondes depuis 1970)'),
      seconds('to', 'Fin de la fenêtre (secondes depuis 1970)'),
      { name: 'limit', description: 'Nombre maximal (1000 au plus avec une fenêtre)', schema: { type: 'integer', minimum: 1 } },
    ],
    ok: { description: 'La liste des événements.' },
    errors: [400],
  },
  { method: 'get', path: '/clips/{id}', group: 'Caméra', summary: 'Le clip original (H.265, 4K)', secured: true, params: CLIP, ok: { description: 'La vidéo (Range accepté).', contentType: 'video/mp4' }, errors: [404] },
  { method: 'get', path: '/clips/{id}/h264', group: 'Caméra', summary: 'La copie légère du clip (H.264, 720p)', secured: true, params: CLIP, ok: { description: 'La vidéo (Range accepté).', contentType: 'video/mp4' }, errors: [404] },
  { method: 'get', path: '/clips/{id}/audio', group: 'Caméra', summary: 'Le son du clip', description: '404 pour une caméra sans micro ou un clip d’avant.', secured: true, params: CLIP, ok: { description: 'Le son AAC.', contentType: 'audio/aac' }, errors: [404] },
  { method: 'get', path: '/clips/{id}/shapes', group: 'Caméra', summary: 'Les contours du mouvement du clip', description: '404 pour un clip fait avant leur ajout.', secured: true, params: CLIP, ok: { description: 'Les contours (JSON).' }, errors: [404] },
  {
    method: 'put',
    path: '/clips/{id}/saved',
    group: 'Caméra',
    summary: 'Sauvegarder un clip',
    description: 'House Sync n’efface jamais un clip sauvegardé.',
    secured: true,
    params: CLIP,
    body: { description: 'Sauvegardé ou libéré.', schema: { type: 'object', properties: { saved: flag }, required: ['saved'] }, example: { saved: true } },
    ok: { description: 'Le nouvel état.', example: { id: 'e1', saved: true } },
    errors: [400, 404],
  },
  {
    method: 'put',
    path: '/clips/{id}/note',
    group: 'Caméra',
    summary: 'La note d’un clip',
    description: '200 caractères au plus ; vide : supprime la note.',
    secured: true,
    params: CLIP,
    body: { description: 'La note.', schema: { type: 'object', properties: { note: text }, required: ['note'] }, example: { note: 'renard' } },
    ok: { description: 'La note gardée.', example: { id: 'e1', note: 'renard' } },
    errors: [400, 404],
  },
  {
    method: 'put',
    path: '/clips/{id}/emoji',
    group: 'Caméra',
    summary: 'L’emoji d’un clip',
    description: 'Un seul pictogramme ; null le retire. Il s’affiche sur la carte de la maison.',
    secured: true,
    params: CLIP,
    body: { description: 'Le pictogramme.', schema: { type: 'object', properties: { emoji: { type: 'string', nullable: true } }, required: ['emoji'] }, example: { emoji: '🦊' } },
    ok: { description: 'Le pictogramme gardé.', example: { id: 'e1', emoji: '🦊' } },
    errors: [400, 404],
  },
  { method: 'get', path: '/snapshots', group: 'Caméra', summary: 'Les instants couverts par une image', secured: true, query: [cameraQuery, seconds('from', 'Début (secondes)'), seconds('to', 'Fin (secondes)')], ok: { description: 'La liste des instants.' }, errors: [400] },
  { method: 'get', path: '/snapshot', group: 'Caméra', summary: 'L’image la plus proche d’un instant', description: 'Tolérance de 5 minutes. L’identifiant permanent de l’image est dans X-Snapshot-Code.', secured: true, query: [cameraQuery, { name: 'at', description: 'L’instant (secondes depuis 1970)', required: true, schema: { type: 'number' } }], ok: { description: 'L’image.', contentType: 'image/jpeg', headers: { 'X-Snapshot-At': 'L’instant de l’image (secondes)', 'X-Snapshot-Code': 'Le code permanent de l’image' } }, errors: [400, 404] },
  {
    method: 'get',
    path: '/stream',
    group: 'Caméra',
    summary: 'Le direct MJPEG',
    description: 'Relayé de go2rtc tant que le client reste connecté (flux continu : l’essai de Swagger ne se termine pas).',
    secured: true,
    query: [cameraQuery, { name: 'quality', description: 'hd : le flux principal', schema: { type: 'string', enum: ['hd'] } }, { name: 'screen', description: 'mobile : le flux réduit', schema: { type: 'string', enum: ['mobile'] } }],
    ok: { description: 'Le flux multipart.', contentType: 'multipart/x-mixed-replace' },
    errors: [400, 404, 502],
  },
  { method: 'get', path: '/frame', group: 'Caméra', summary: 'L’image à l’instant', secured: true, query: [cameraQuery, { name: 'quality', description: 'hd : le flux principal', schema: { type: 'string', enum: ['hd'] } }, { name: 'screen', description: 'mobile : le flux réduit', schema: { type: 'string', enum: ['mobile'] } }], ok: { description: 'L’image.', contentType: 'image/jpeg' }, errors: [400, 404, 502] },
  { method: 'get', path: '/audio', group: 'Caméra', summary: 'Le son en direct', description: 'AAC en flux continu, tant que le client reste connecté.', secured: true, query: [cameraQuery], ok: { description: 'Le flux audio.', contentType: 'audio/aac' }, errors: [400, 404, 502] },
  { method: 'get', path: '/poe', group: 'Caméra', summary: 'L’alimentation PoE de chaque caméra', description: 'Lue sur le switch : PoE activé, alimentée, watts, streaming.', secured: true, ok: { description: 'Une entrée par caméra.' }, errors: [503] },
  { method: 'post', path: '/poe/{camera}', group: 'Caméra', summary: 'Allumer ou éteindre une caméra', description: 'Coupe ou rend le PoE de son port sur le switch.', secured: true, params: CAMERA, body: onBody('true : alimenter, false : couper.'), ok: { description: 'L’état de la caméra.' }, errors: [400, 404, 503] },
  { method: 'get', path: '/zones', group: 'Caméra', summary: 'Les zones de surveillance', description: 'Un polygone par caméra (3 à 1000 sommets, parts de l’image de 0 à 1). Sans entrée : toute l’image.', secured: true, ok: { description: 'Les zones par caméra.', example: { 'voliere-exterieur': [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9]] } } },
  { method: 'put', path: '/zones/{camera}', group: 'Caméra', summary: 'Fixer la zone d’une caméra', secured: true, params: CAMERA, body: { description: 'Le polygone, ou null pour toute l’image.', schema: { type: 'object', properties: { points: { type: 'array', nullable: true, minItems: 3, maxItems: 1000, items: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'number', minimum: 0, maximum: 1 } } } }, required: ['points'] }, example: { points: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]] } }, ok: { description: 'Toutes les zones.' }, errors: [400] },
  { method: 'get', path: '/markers', group: 'Caméra', summary: 'Les repères de caméras', description: 'Pour chaque caméra, la place des icônes des autres sur son image (de -0,5 à 1,5).', secured: true, ok: { description: 'Les repères par caméra.' } },
  { method: 'put', path: '/markers/{camera}', group: 'Caméra', summary: 'Fixer les repères d’une caméra', secured: true, params: CAMERA, body: { description: 'Les repères (8 au plus), ou null pour les places de départ.', schema: { type: 'object', properties: { markers: { type: 'array', nullable: true, maxItems: 8, items: { type: 'object', properties: { target: text, x: { type: 'number', minimum: -0.5, maximum: 1.5 }, y: { type: 'number', minimum: -0.5, maximum: 1.5 } }, required: ['target', 'x', 'y'] } } }, required: ['markers'] }, example: { markers: [{ target: 'voliere-exterieur', x: 0.3, y: 0.5 }] } }, ok: { description: 'Tous les repères.' }, errors: [400] },
  { method: 'get', path: '/record/{camera}', group: 'Caméra', summary: 'L’enregistrement à la main : état', description: 'En cours ou non, et depuis quand (relayé de l’enregistreur).', secured: true, params: CAMERA, ok: { description: 'L’état de l’enregistrement.' }, errors: [400, 502, 503] },
  { method: 'post', path: '/record/{camera}', group: 'Caméra', summary: 'Commencer un clip à la main', description: 'Un mouvement fictif ; s’arrête seul au bout de 3 minutes. Le clip est sauvegardé d’office. Sans corps.', secured: true, params: CAMERA, ok: { description: 'L’enregistrement commence.' }, errors: [400, 409, 502, 503] },
  { method: 'delete', path: '/record/{camera}', group: 'Caméra', summary: 'Arrêter le clip à la main', description: '409 s’il n’y avait pas d’enregistrement. Sans corps.', secured: true, params: CAMERA, ok: { description: 'L’enregistrement est arrêté.' }, errors: [400, 409, 502, 503] },

  // Plan
  { method: 'get', path: '/plan', group: 'Plan', summary: 'Le plan de la maison', description: 'Le même sur tous les appareils. {"plan": null} s’il n’y en a pas encore.', secured: true, ok: { description: 'Le plan.', example: { plan: null } } },
  { method: 'put', path: '/plan', group: 'Plan', summary: 'Remplacer le plan', description: '128 ko au plus. Positions en longitude et latitude (version 2), tailles en mètres, angles en caps.', secured: true, body: { description: 'Le document du plan.', schema: { type: 'object', properties: { version: { type: 'integer' }, trees: { type: 'array', items: { type: 'object' } }, hedges: { type: 'array', items: { type: 'object' } }, cage: { type: 'object', nullable: true }, offsets: { type: 'object' }, items: { type: 'object' }, cameras: { type: 'array', items: { type: 'object' } }, links: { type: 'object' } } }, example: { version: 2, trees: [{ id: 't1', x: 2.65, y: 48.522, r: 1.8 }], hedges: [], cage: { x: 2.6502, y: 48.5221 }, offsets: {}, items: {}, cameras: [], links: {} } }, ok: { description: 'Le plan gardé.' }, errors: [400] },

  // Lumière
  { method: 'get', path: '/hue', group: 'Lumière', summary: 'Les pièces et leurs lampes', description: 'Chaque lampe : id, name, on, bri, reachable, color, watts (estimés).', secured: true, ok: { description: 'Les pièces.' }, errors: [503] },
  { method: 'get', path: '/hue/automations', group: 'Lumière', summary: 'Les règles du pont en phrases', secured: true, ok: { description: 'Les automatisations.' }, errors: [503] },
  { method: 'get', path: '/hue/sensors', group: 'Lumière', summary: 'Les détecteurs avec température et luminosité', secured: true, ok: { description: 'Les détecteurs.' }, errors: [503] },
  { method: 'get', path: '/hue/positions', group: 'Lumière', summary: 'La position des ampoules sur le plan', secured: true, ok: { description: 'Les positions par lampe.' }, errors: [503] },
  { method: 'put', path: '/hue/positions', group: 'Lumière', summary: 'Garder la position des ampoules', description: 'Fusionnée avec celles déjà gardées.', secured: true, body: { description: 'Une position par id de lampe.', schema: { type: 'object', additionalProperties: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] } }, example: { '26': { x: 120, y: 80 } } }, ok: { description: 'Les positions gardées.' }, errors: [400, 503] },
  { method: 'put', path: '/hue/rooms/{id}', group: 'Lumière', summary: 'Allumer, éteindre ou régler une pièce', secured: true, params: { id: 'Identifiant de la pièce chez le pont' }, body: LIGHT_STATE, ok: { description: 'La pièce changée.' }, errors: [400, 404, 503] },
  { method: 'put', path: '/hue/lights/{id}', group: 'Lumière', summary: 'Allumer, éteindre ou régler une lampe', secured: true, params: { id: 'Identifiant de la lampe chez le pont' }, body: LIGHT_STATE, ok: { description: 'La lampe changée.' }, errors: [400, 404, 503] },
  { method: 'get', path: '/hue/lights/{id}/fade', group: 'Lumière', summary: 'L’extinction en douceur : état', description: 'fading, ends_at, started_at, duration_seconds, from_bri.', secured: true, params: { id: 'Identifiant de la lampe' }, ok: { description: 'L’état de l’extinction.' }, errors: [404, 503] },
  { method: 'post', path: '/hue/lights/{id}/fade', group: 'Lumière', summary: 'Lancer l’extinction en douceur', description: 'La luminosité descend au minimum, puis la lampe s’éteint et retrouve sa luminosité d’avant. Le pont fait tout (transition et minuteur) : l’API peut s’arrêter. 409 si la lampe est éteinte ou injoignable.', secured: true, params: { id: 'Identifiant de la lampe' }, body: { description: 'La durée (15 par défaut).', required: false, schema: { type: 'object', properties: { minutes: { type: 'number', minimum: 1, maximum: 60 } } }, example: { minutes: 15 } }, ok: { description: 'L’extinction commence.' }, errors: [400, 404, 409, 503] },
  { method: 'delete', path: '/hue/lights/{id}/fade', group: 'Lumière', summary: 'Annuler l’extinction en douceur', description: 'Supprime le minuteur et rend la luminosité d’avant en 2 s. Sans corps.', secured: true, params: { id: 'Identifiant de la lampe' }, ok: { description: 'L’extinction est annulée.' }, errors: [404, 503] },

  // Prise
  { method: 'get', path: '/plug', group: 'Prise', summary: 'La prise connectée (chauffage)', description: 'alias, model, on, rssi, onTime, timerSeconds (ce qui reste du minuteur), offOnMotion.', secured: true, ok: { description: 'L’état de la prise.' }, errors: [502, 503] },
  {
    method: 'post',
    path: '/plug',
    group: 'Prise',
    summary: 'Allumer (avec une durée) ou éteindre la prise',
    description: 'Allumer sans durée est refusé : la prise ne reste jamais allumée sans fin. Le minuteur est celui de la prise, elle s’éteint même si l’API tombe.',
    secured: true,
    body: {
      description: 'on, et minutes (1 à 120) pour allumer ; offOnMotion éteint au premier mouvement du détecteur intérieur.',
      schema: { type: 'object', properties: { on: flag, minutes: { type: 'integer', minimum: 1, maximum: 120 }, offOnMotion: flag }, required: ['on'] },
      example: { on: true, minutes: 5, offOnMotion: true },
    },
    ok: { description: 'L’état de la prise.' },
    errors: [400, 502, 503],
  },
  { method: 'get', path: '/plug/heating', group: 'Prise', summary: 'Le chauffage automatique : réglages et état', description: 'enabled, thresholdC, minutes, cooldownMinutes, lastActivationAt, nextAllowedAt, temperature, night, cold.', secured: true, ok: { description: 'La règle et son état.' }, errors: [503] },
  {
    method: 'put',
    path: '/plug/heating',
    group: 'Prise',
    summary: 'Changer les réglages du chauffage automatique',
    description: 'Une valeur absente garde l’ancienne.',
    secured: true,
    body: {
      description: 'Réglages de la règle.',
      schema: {
        type: 'object',
        properties: { enabled: flag, thresholdC: { type: 'number', minimum: -30, maximum: 30 }, minutes: { type: 'integer', minimum: 1, maximum: 120 }, cooldownMinutes: { type: 'integer', minimum: 1, maximum: 1440, description: 'Au moins minutes' } },
      },
      example: { thresholdC: 3, minutes: 5, cooldownMinutes: 20 },
    },
    ok: { description: 'Les réglages et l’état.' },
    errors: [400, 503],
  },
  { method: 'get', path: '/plug/log', group: 'Prise', summary: 'Le journal des activations du chauffage', description: 'Le plus récent d’abord : at, origin (auto ou manuel), minutes, temperature, note, cost (euros).', secured: true, query: [{ name: 'limit', description: 'Nombre de lignes (1 à 500, 50 par défaut)', schema: { type: 'integer', minimum: 1, maximum: 500 } }], ok: { description: 'Les lignes du journal.' }, errors: [400, 503] },

  // Clim
  { method: 'get', path: '/ac', group: 'Clim', summary: 'Les climatisations Mitsubishi', description: 'Par unité : id, name, reachable, power, mode, targetTemp, roomTemp, fan, vane, wideVane. Injoignable : reachable false.', secured: true, ok: { description: 'Les unités.' }, errors: [503] },
  {
    method: 'post',
    path: '/ac/{id}',
    group: 'Clim',
    summary: 'Changer une climatisation',
    description: 'Un ou plusieurs réglages ; les autres ne bougent pas. Rend l’état d’avant avec le changement, sans relire le module (2 à 3 s).',
    secured: true,
    params: { id: 'Identifiant de l’unité (AC_UNITS)' },
    body: {
      description: 'Les réglages à changer.',
      schema: {
        type: 'object',
        properties: {
          on: flag,
          mode: { type: 'string', enum: ['heat', 'cool', 'dry', 'fan', 'auto'] },
          temperature: { type: 'number', minimum: 16, maximum: 31, description: 'Par pas de 0,5' },
          fan: { type: 'string', enum: ['auto', 'quiet', '1', '2', '3', '4'] },
          vane: { type: 'string', enum: ['auto', '1', '2', '3', '4', '5', 'swing'] },
          wideVane: { type: 'string', enum: ['left', 'left-center', 'center', 'right-center', 'right', 'swing'] },
        },
      },
      example: { on: true, mode: 'heat', temperature: 21, fan: 'auto' },
    },
    ok: { description: 'L’unité.' },
    errors: [400, 404, 502, 503],
  },

  // Volet
  { method: 'get', path: '/shutters', group: 'Volet', summary: 'Les volets roulants', description: 'mock vrai : simulation, aucun signal radio. Par volet : id, name, lastCommand, lastAt, closeSeconds, halfRunning, auto.', secured: true, ok: { description: 'Les volets.' }, errors: [503] },
  { method: 'post', path: '/shutters/{id}', group: 'Volet', summary: 'Envoyer un ordre à un volet', description: 'Tout autre ordre au même volet annule une fermeture à moitié en cours.', secured: true, params: { id: 'Identifiant du volet' }, body: { description: 'L’ordre.', schema: { type: 'object', properties: { command: { type: 'string', enum: ['up', 'down', 'stop'] } }, required: ['command'] }, example: { command: 'up' } }, ok: { description: 'Le volet.' }, errors: [400, 404, 502, 503] },
  { method: 'post', path: '/shutters/{id}/half', group: 'Volet', summary: 'Fermer à moitié', description: 'Monte, attend le temps de fermeture, descend puis stoppe à la moitié ; la suite tourne en tâche de fond. 409 sans temps de fermeture (SHUTTERS).', secured: true, params: { id: 'Identifiant du volet' }, ok: { status: 202, description: 'Commencé.' }, errors: [404, 409, 502, 503] },
  { method: 'put', path: '/shutters/{id}/auto', group: 'Volet', summary: 'L’action automatique d’un volet', description: 'open : ouvrir au lever du soleil, close : fermer à son coucher ; une option absente garde sa valeur.', secured: true, params: { id: 'Identifiant du volet' }, body: { description: 'Les options.', schema: { type: 'object', properties: { open: flag, close: flag } }, example: { open: true, close: true } }, ok: { description: 'Le volet.' }, errors: [400, 404, 503] },

  // Box
  { method: 'get', path: '/box', group: 'Box', summary: 'La Freebox', description: 'configured, reachable, model, firmware, uptime, connection, wifi et les appareils. Sans jeton : 200 avec configured false.', secured: true, ok: { description: 'L’état de la box.' } },
  { method: 'get', path: '/box/guest-wifi', group: 'Box', summary: 'Le WiFi invité', description: 'ssid, password, description, maxUses, users. Le mot de passe n’est pas dans GET /box.', secured: true, ok: { description: 'Le WiFi invité.' }, errors: [404, 502, 503] },
  { method: 'get', path: '/box/guests', group: 'Box', summary: 'Les invités de la box', description: 'Tout appareil hors de la maison (box-known.json) : filterState (filtrage MAC du WiFi), guests (mac, name, ip, type, vendor, firstSeen, lastSeen, active, excluded) et events (connect ou disconnect, le plus récent d’abord).', secured: true, query: [{ name: 'limit', description: 'Nombre d’événements (1 à 500, 100 par défaut)', schema: { type: 'integer', minimum: 1, maximum: 500 } }], ok: { description: 'Le résumé, les invités et les événements.' }, errors: [400, 503] },
  { method: 'put', path: '/box/guests/{mac}/exclude', group: 'Box', summary: 'Exclure ou réadmettre un invité du WiFi', description: 'Filtrage par adresse MAC du WiFi de la box (liste noire) : ne coupe que le WiFi, pas un appareil branché par câble. Exige le droit « Modification des réglages » de l’application. 409 si la box est en liste blanche.', secured: true, params: { mac: 'Adresse MAC de l’invité' }, body: { description: 'Exclure ou réadmettre.', schema: { type: 'object', properties: { excluded: bool('true : exclu') }, required: ['excluded'] }, example: { excluded: true } }, ok: { description: 'L’état voulu.', example: { excluded: true } }, errors: [400, 404, 409, 502, 503] },
  { method: 'get', path: '/box/known', group: 'Box', summary: 'Les appareils de la maison', description: 'La liste {mac, name, ip} de box-known.json (photo des appareils actifs au premier démarrage, puis ceux ajoutés).', secured: true, ok: { description: 'Les appareils de la maison.' }, errors: [503] },
  { method: 'put', path: '/box/known', group: 'Box', summary: 'Ajouter un appareil à la maison', description: 'Ajoute la MAC à box-known.json et la retire des invités (fichier de l’API, la box n’est pas touchée).', secured: true, body: { description: 'La MAC de l’appareil.', schema: { type: 'object', properties: { mac: { type: 'string' } }, required: ['mac'] }, example: { mac: 'AA:BB:CC:DD:EE:FF' } }, ok: { description: 'L’appareil ajouté.' }, errors: [400, 503] },
  { method: 'delete', path: '/box/known/{mac}', group: 'Box', summary: 'Retirer un appareil de la maison', description: 'Sans toucher à la box : l’appareil sort de la liste de la maison et devient un invité (liste « Appareils invités »).', secured: true, params: { mac: 'Adresse MAC, par exemple 82:F4:D3:AA:32:29' }, ok: { description: 'La maison.' }, errors: [400, 404, 503] },
  { method: 'put', path: '/box/wifi', group: 'Box', summary: 'Allumer ou éteindre le WiFi', secured: true, body: { description: 'Le WiFi voulu.', schema: { type: 'object', properties: { enabled: bool('true : allumé') }, required: ['enabled'] }, example: { enabled: true } }, ok: { description: 'L’état du WiFi.', example: { enabled: true } }, errors: [400, 502, 503] },

  // TV
  { method: 'get', path: '/tv', group: 'TV', summary: 'La télécommande du Player', description: 'configured, paired (le Player est appairé : certificat client gardé par l’API), online (le Player est actif dans la box, null si inconnu) et name (nom du Player dans la box, si connu). Rien d’autre n’est lu.', secured: true, ok: { description: 'L’état.', example: { configured: true, paired: true, online: true, name: 'Freebox Player POP' } } },
  { method: 'post', path: '/tv/pair/start', group: 'TV', summary: 'Ouvrir l’appairage', description: 'Se connecte au Player (port 6467) : il affiche un code de 6 caractères hexadécimaux sur la TV. 502 Player éteint ou injoignable, 504 pas de réponse.', secured: true, ok: { description: 'L’appairage est ouvert.', example: { started: true } }, errors: [502, 503, 504] },
  { method: 'post', path: '/tv/pair/code', group: 'TV', summary: 'Terminer l’appairage', description: 'Envoie le code lu sur la TV et garde le certificat client. 400 code mal formé, 409 aucun appairage ouvert (ou délai de 5 min dépassé), 422 code faux (on peut le ressaisir), 502 Player éteint.', secured: true, body: { description: 'Le code.', schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] }, example: { code: '1A2B3C' } }, ok: { description: 'Appairé.', example: { paired: true } }, errors: [400, 409, 422, 502, 503, 504] },
  { method: 'delete', path: '/tv/pair', group: 'TV', summary: 'Oublier l’appairage', description: 'Supprime le certificat client et sa clé de l’API.', secured: true, ok: { description: 'Dissocié.', example: { paired: false } }, errors: [503] },
  { method: 'post', path: '/tv/key', group: 'TV', summary: 'Envoyer une touche au Player', description: 'Liste blanche de touches nommées, envoyées en KeyCode Android. long : appui long. 409 Player non appairé, 502 Player éteint ou injoignable, 504 pas de réponse.', secured: true, body: { description: 'La touche.', schema: { type: 'object', properties: { key: { type: 'string', enum: [...TV_KEYS] }, long: { type: 'boolean' } }, required: ['key'] }, example: { key: 'vol_inc' } }, ok: { description: 'La touche envoyée.', example: { key: 'vol_inc', long: false } }, errors: [400, 409, 502, 503, 504] },
]
