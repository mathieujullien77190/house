# motion – l'enregistreur

Un programme TypeScript (Node 24, sans dépendance, ffmpeg dans l'image) fait pour être modifié au fil du temps. Il enregistre, détecte le mouvement et fabrique les clips, simplement, par caméra. Il n'a **pas** de détection d'objets : un mouvement est un mouvement.

## Ce qu'il fait, pour chaque caméra de `CAMERAS`

1. **Enregistre** le flux principal (`rtsp://go2rtc:8554/<caméra>_main`, 4K H.265) par segments de `SEGMENT_SECONDS` (10 s) en **copie sans transcodage** (ffmpeg `-c copy -f segment`), dans `data/recordings/<caméra>/<heure en secondes>.ts`. Il ne garde que `RETENTION_HOURS` (6 h) de segments (nettoyage chaque minute).
2. **Détecte** le mouvement sur le flux léger (`<caméra>_sub`) : ffmpeg sort des images grises 160×90, 5 par seconde, on compare chaque image à la précédente (`detector.ts`). Un événement s'ouvre après `START_FRAMES` images en mouvement, se ferme après `END_SECONDS` de calme.
3. **Fait le clip** d'un événement fini, quand ses segments sont tous écrits (`postSeconds` après la fin + un segment + 3 s) : les segments de `start − PRE_SECONDS` à `end + POST_SECONDS` mis bout à bout, sans transcodage, dans un MP4 (`-tag:v hvc1` pour du H.265, `VIDEO_TAG`), dans `data/clips/<id>.mp4`. Le clip commence au segment qui précède `start − PRE_SECONDS` : son début réel (`clip_start`) est gardé dans l’événement et envoyé à House Sync dans l’en-tête `X-Clip-Start` du clip.
4. **Répond à House Sync** (`server.ts`, port 8080 interne, jamais publié, sans mot de passe) dans la forme que Frigate offrait avant (conservée) : `GET /api/config` (les caméras et leur flux de direct), `GET /api/events` (`after`, `before`, `has_clip`, `in_progress`, `limit`), `GET /api/events/<id>` et `/clip.mp4`, `GET /api/<caméra>/latest.jpg?h=` (une image du flux principal prise par go2rtc).

## Les fichiers

- `src/index.ts` : l'assemblage (une boucle par caméra, le tick de 5 s pour les clips, le nettoyage).
- `src/detector.ts` : fonctions pures, `changedShare` (part des pixels changés de plus de `pixelThreshold`) et `createDetector` (la machine à états ; une part au-delà de `lightChangeThreshold` est un changement de lumière, ignoré).
- `src/watcher.ts` : ffmpeg sur le flux léger, relancé s'il s'arrête. `src/segments.ts` : l'enregistrement par segments, le choix des segments d'une plage, le nettoyage. `src/clips.ts` : l'assemblage d'un clip. `src/events.ts` : le magasin d'événements, écrit dans `data/clips/events.json` (survit à un redémarrage). `src/server.ts` : l'API. `src/config.ts` : le réglage par l'environnement.
- `src/*.test.ts` : les tests (`npm test`).

## Régler

Trop d'événements → monter `AREA_THRESHOLD` (part de pixels, 0,005 par défaut) ou `PIXEL_THRESHOLD` (écart de gris, 25) ; mouvements ratés → les baisser. Idées pour la suite : zones à ignorer (masque), fond moyen glissant au lieu de l'image précédente, plusieurs caméras (`CAMERAS=portail,jardin` : il faut aussi les flux `<nom>_main`, `<nom>_sub`, `<nom>_sub_mjpeg` dans `go2rtc/go2rtc.yaml`).

Conteneur : `docker compose up -d --build motion`, `docker compose logs -f motion`. Vérifications : `npm run typecheck && npm test`.
