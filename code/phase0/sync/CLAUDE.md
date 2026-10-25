# sync – House Sync

Script TypeScript exécuté par Node 24 (`src/index.ts`), sans dépendance, le **seul programme qui écrit** sur le disque backup (`/data`, soit `data/backup`) : `events.db` (SQLite), `clips/<caméra>/<id>.mp4`, `snapshots/<caméra>/<t>.jpg`.

## Ce qu'il fait, toutes les `POLL_INTERVAL_SECONDS` (5 s)

1. Se connecte à Frigate avec le compte viewer (`POST /api/login`, cookie `frigate_token`, reconnexion si 401).
2. Lit la configuration de Frigate : pour chaque caméra, écrit l'adresse de la dernière image (`last_images`) et celle de la page du direct (`live_streams`, premier flux `live` déclaré), avec `FRIGATE_PUBLIC_URL`.
3. Lit les événements terminés qui ont un clip (`after` = dernier connu − 1 h, pages de 50 jusqu'à épuisement), copie chaque clip inconnu, insère la ligne dans `events`. Un clip pas encore prêt laisse `clip_path` à NULL ; la copie est retentée à chaque tour pendant 6 h.
4. Toutes les `SNAPSHOT_INTERVAL_SECONDS` (60 s) : garde la dernière image de chaque caméra (720 px) dans `snapshots`, et supprime celles de plus de `SNAPSHOT_RETENTION_DAYS` (7) jours.

## Sa page (port 8081, HTTPS)

Sert `web/dist` (la page React, voir `web/CLAUDE.md`) en public, et derrière une session (`POST /login` avec la clé `HOUSE_KEY` = `API_KEY`, cookie en mémoire) : `GET /api/overview`, `GET /api/table?name=&page=&size=`, `GET /api/clips?page=&size=`, `GET /files/<clips ou snapshots/...>`. Les lectures sont dans `src/data.ts` (fonctions pures, pagination bornée à 100).

Après un changement : `docker compose up -d --build sync`. Les logs disent à chaque tour le nombre de caméras, d'événements copiés, de clips récupérés et d'images gardées.
