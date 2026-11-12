# motion – l'enregistreur

TypeScript (Node 24, sans dépendance, ffmpeg dans l'image). Enregistre, détecte le mouvement et fabrique les clips, par caméra. **Pas de détection d'objets** : un mouvement est un mouvement.

L'API (port 8080 interne, sans mot de passe) n'est jamais publiée : seuls House Sync et House API (enregistrement à la main) la parlent (`../docs/securite.md`).

## En bref

Pour chaque caméra de `CAMERAS` :

1. Enregistre le flux principal en segments de 10 s, copie sans transcodage, gardés 6 h.
2. Détecte le mouvement sur le flux léger.
3. Fait le clip de chaque événement fini, puis fusionne les clips qui se recouvrent.
4. Obéit à House Sync : détection, sensibilité, zone, enregistrement manuel, son.
5. Répond à House Sync dans la forme de l'ancienne API de Frigate.

Détail, routes, seuils : `src/CLAUDE.md`.

## Fichiers (`src/`)

- `index.ts` : assemblage (une boucle par caméra, tick de 5 s pour les clips, nettoyage).
- `detector.ts`, `watcher.ts` : détecteur (pur) ; ffmpeg du flux léger, relancé s'il s'arrête.
- `segments.ts`, `clips.ts`, `merge.ts` : enregistrement, assemblage d'un clip, groupes à fusionner.
- `events.ts` : magasin d'événements (`data/clips/events.json`). `closeOrphans` ferme au démarrage les événements restés ouverts, sinon ils seraient « en cours » pour toujours.
- `audio.ts`, `sensitivity.ts`, `zone.ts` : son à part, seuils par niveau, masque de zone.
- `eyes.ts`, `trigger.ts` : yeux qui brillent, événement déclenché de l'extérieur.
- `server.ts`, `config.ts`, `shutdown.ts` : API, environnement, arrêt propre des ffmpeg.

## Régler

- Le plus simple : les curseurs « Sensibilité du mouvement » et « Durée minimale d'un mouvement » de House Sync, par caméra.
- Trop d'événements : monter `AREA_THRESHOLD` (0,005 par défaut) ou `PIXEL_THRESHOLD` (25). Mouvements ratés : les baisser.
- Autres variables (défauts commentés dans `docker-compose.yml`) : `FPS`, `WIDTH`, `HEIGHT`, `LIGHT_CHANGE_THRESHOLD`, `PRE_SECONDS`, `POST_SECONDS`, `SEGMENT_SECONDS`, `RETENTION_HOURS`, `CLIPS_DIR`, `STATE_FILE`, `MIN_MOTION_SECONDS` (1 s), `AUDIO_*`.
- Nouvelle caméra : une entrée dans `CAMERAS`, ses flux dans `go2rtc/go2rtc.yaml`.

Vérifications : `npm run typecheck && npm run lint && npm test` (pas de `test:coverage`). Après un changement : `docker compose up -d --build motion`.
