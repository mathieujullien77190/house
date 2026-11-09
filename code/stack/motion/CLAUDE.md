# motion – l'enregistreur

Un programme TypeScript (Node 24, sans dépendance, ffmpeg dans l'image) fait pour être modifié au fil du temps. Il enregistre, détecte le mouvement et fabrique les clips, simplement, par caméra. Il n'a **pas** de détection d'objets : un mouvement est un mouvement. Son API (port 8080 interne, sans mot de passe) n'est jamais publiée ; seul House Sync (et House API pour l'enregistrement à la main) la parle (`../docs/securite.md`).

## En bref (pour chaque caméra de `CAMERAS`)

1. **Enregistre** le flux principal (`rtsp://go2rtc:8554/<caméra>_main`, 4K H.265) en segments de `SEGMENT_SECONDS` (10 s), copie sans transcodage, dans `data/recordings/<caméra>/<heure en secondes>.ts`, gardés `RETENTION_HOURS` (6 h).
2. **Détecte** le mouvement sur le flux léger (`<caméra>_sub`).
3. **Fait le clip** de chaque événement fini (original + copie légère H.264 720p), puis **fusionne** les clips qui se recouvrent.
4. **Obéit à House Sync** : détection allumée ou éteinte, sensibilité, zone de surveillance ; **enregistre à la main** sur demande ; **sépare le son** pour les caméras à micro.
5. **Répond à House Sync** dans la forme de l'ancienne API de Frigate.

Le détail de chaque étape, les routes, les seuils : **`src/CLAUDE.md`**.

## Les fichiers (`src/`)

- `index.ts` : l'assemblage (une boucle par caméra, le tick de 5 s pour les clips, le nettoyage).
- `detector.ts` : fonctions pures, `changedShare` et `createDetector` (la machine à états). `watcher.ts` : ffmpeg sur le flux léger, relancé s'il s'arrête.
- `segments.ts` : l'enregistrement par segments, le choix des segments d'une plage, le nettoyage. `clips.ts` : l'assemblage d'un clip. `merge.ts` : `findMergeGroups`, la fonction pure qui trouve les groupes à fusionner.
- `events.ts` : le magasin d'événements, écrit dans `data/clips/events.json` (survit à un redémarrage). Au démarrage, `closeOrphans` ferme les événements restés ouverts par l'exécution précédente (le détecteur repart de zéro et ne les fermerait jamais : sinon un événement « en cours » pour toujours dans la frise) ; leur clip se fait ensuite comme les autres.
- `audio.ts` : l'enregistrement du son à part (`recordAudio`), la liste et la purge des fichiers son. `sensitivity.ts` : `detectorForLevel`, les seuils pour un niveau de sensibilité. `zone.ts` : `parsePolygon` et `polygonMask`. (Fonctions pures.)
- `server.ts` : l'API. `config.ts` : le réglage par l'environnement. `shutdown.ts` : l'arrêt (les ffmpeg lancés sont suivis, un seul gestionnaire de SIGTERM/SIGINT les arrête puis quitte).
- `*.test.ts` : les tests.

## Régler

Le plus simple : le curseur « Sensibilité du mouvement » de la page de House Sync (par caméra). Sinon, en base : trop d'événements → monter `AREA_THRESHOLD` (part de pixels, 0,005 par défaut) ou `PIXEL_THRESHOLD` (écart de gris, 25) ; mouvements ratés → les baisser. Idées pour la suite : fond moyen glissant au lieu de l'image précédente, d'autres caméras (une entrée de plus dans `CAMERAS`, leurs flux dans `go2rtc/go2rtc.yaml`). Autres variables : `FPS`, `WIDTH`, `HEIGHT` (l'image analysée), `LIGHT_CHANGE_THRESHOLD`, `PRE_SECONDS`, `POST_SECONDS`, `SEGMENT_SECONDS`, `RETENTION_HOURS`, `CLIPS_DIR`, `STATE_FILE`, `RAIN_CAMERAS` (le filtre pluie : les caméras dont la détection ignore les gouttes, voir `src/CLAUDE.md`), `AUDIO_*` (valeurs par défaut commentées dans `docker-compose.yml`).

Vérifications : `npm run typecheck && npm run lint && npm test` (pas de `test:coverage`). Après un changement : `docker compose up -d --build motion` (voir `../CLAUDE.md`).
