# Phase 0 – la pile en service sur le PC

Des conteneurs Docker (`docker-compose.yml`) sur le PC de la maison, avec une Reolink RLC-810A branchée au switch PoE ES208GP :

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : crée la CA de la maison et le certificat du PC, puis s'arrête | – |
| `go2rtc` | une seule connexion RTSP vers la caméra, qu'il partage (RTSP interne, MJPEG, image à l'instant) | interne |
| `motion` | l'enregistreur : segments du flux principal (6 h), détection de mouvement sur le flux léger, clips MP4, petite API pour House Sync | interne |
| `sync` | House Sync : copie les clips et une image par minute sur le disque backup, écrit SQLite, sert sa page | 8081 |
| `api` | House API (Express) + la WebApp compilée | 8080 |

Un CLAUDE.md par dossier : `certs/`, `go2rtc/`, `motion/`, `sync/`, `sync/web/`, `api/`, `web/`, `ui/` (le paquet `@house/ui` : les composants dumb des deux apps, avec un Storybook).

## Règles

- **Seul House Sync écrit** dans la base (SQLite `data/backup/events.db`, clips, images). L'enregistreur écrit ses propres segments et clips (`data/recordings`, `data/clips`). L'API lit en lecture seule, relaie go2rtc (pour le direct) et ne parle au switch que pour couper ou rendre le PoE d'une caméra. L'API n'expose jamais la base brute : c'est la page de House Sync qui la montre.
- **Une seule clé** : `API_KEY` (en-tête `X-House-Key`) pour l'API et la page de House Sync. L'API ouvre une session (cookie, `GET /auth`) pour ce qu'une balise `<img>` ou `<video>` charge sans en-tête, dont le direct.
- **Le direct** : House API relaie go2rtc (`go2rtc:1984`, jamais publié) : `/stream` (MJPEG, un seul ffmpeg tant qu'un onglet regarde) et `/frame`. Le flux go2rtc `<flux>_mjpeg` est déclaré dans `go2rtc/go2rtc.yaml`. Pour cela l'API rejoint le réseau `sync_net`.
- **Rien n'est publié** à part l'API (8080) et la page de House Sync (8081) : go2rtc et l'API de l'enregistreur n'ont pas de mot de passe et ne sont joignables que par les autres conteneurs.
- **HTTPS** avec le certificat de la CA de la maison (`data/certs/rootCA.pem`, à installer une fois par appareil). La WebApp marche sur n'importe quel hôte du certificat (IP du PC ou `localhost`).
- **Secrets** dans `.env` (ignoré par git), modèle dans `.env.example`. Jamais de mot de passe dans le code, la doc ou les commits : go2rtc lit celui de la caméra dans `REOLINK_PASSWORD`.
- **Données** dans `data/` (ignoré) : `data/recordings`, `data/clips`, `data/backup`, `data/certs`.
- Les fichiers de ce dossier apparaissent dans la vue « Code » du site : chaque fichier ajouté a une explication dans `src/components/CodeBrowser/constants.ts`.

## Commandes

```
docker compose up -d --build          # tout (re)construire et démarrer
docker compose up -d --build api      # après un changement dans api/ ou web/
docker compose up -d --build sync     # après un changement dans sync/ ou sync/web/
docker compose up -d --build motion   # après un changement dans motion/
docker compose restart go2rtc         # après un changement de go2rtc/go2rtc.yaml
docker compose logs -f motion         # les débuts et fins de mouvement, les clips
docker compose logs -f sync           # ce que fait House Sync
```

Vérifications : `npm run typecheck` dans `api/`, `npm run typecheck && npm test` dans `motion/`, `npm run typecheck && npm run lint && npm run build` dans `web/` et `sync/web/`, `npm run typecheck && npm run lint && npm run build-storybook` dans `ui/`. Les deux apps ont le même style : même `PageHeader`, mêmes `Tabs`, mêmes composants de `@house/ui`. Docker Desktop doit tourner (il est dans `%LOCALAPPDATA%\Programs\DockerDesktop`).

## Réglages (docker-compose.yml et .env)

`POLL_INTERVAL_SECONDS` (5 s, House Sync vers l'enregistreur), `SNAPSHOT_INTERVAL_SECONDS` (60 s), `SNAPSHOT_RETENTION_DAYS` (7), `RETENTION_HOURS` (6, l'enregistreur), `CERT_HOSTS` (hôtes du certificat), `API_KEY`, `REOLINK_PASSWORD`, `SWITCH_USER` et `SWITCH_PASSWORD` (le compte de la page web du switch, pour couper le PoE d'une caméra). Les seuils de la détection de mouvement : `PIXEL_THRESHOLD`, `AREA_THRESHOLD`, `START_FRAMES`, `END_SECONDS` (voir `motion/CLAUDE.md`).
