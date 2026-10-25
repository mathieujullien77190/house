# Phase 0 – la pile en service sur le PC

Quatre conteneurs Docker (`docker-compose.yml`), sur le PC de la maison, avec une Reolink RLC-810A branchée au switch PoE ES208GP :

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : crée la CA de la maison et le certificat du PC, puis s'arrête | – |
| `frigate` | lit la caméra (RTSP via go2rtc), détecte les personnes, enregistre sur mouvement ; son go2rtc (1984, interne) fournit le direct | 8971 |
| `sync` | House Sync : copie les clips et une image par minute sur le disque backup, écrit SQLite, sert sa page | 8081 |
| `api` | House API (Express) + la WebApp compilée | 8080 |

Un CLAUDE.md par dossier : `certs/`, `frigate/`, `sync/`, `sync/web/`, `api/`, `web/`, `ui/` (le paquet `@house/ui` : les composants dumb des deux apps, avec un Storybook).

## Règles

- **Seul House Sync écrit** (SQLite `data/backup/events.db`, clips, images). L'API lit en lecture seule et n'appelle jamais l'API de Frigate (elle relaie seulement go2rtc pour le direct). L'API n'expose jamais la base brute : c'est la page de House Sync qui la montre.
- **Une seule clé** : `API_KEY` (en-tête `X-House-Key`) pour l'API et la page de House Sync. L'API ouvre une session (cookie, `GET /auth`) pour ce qu'une balise `<img>` ou `<video>` charge sans en-tête, dont le direct. Le navigateur n'a **jamais** besoin de se connecter à Frigate (réservé à l'administration, port 8971). Les identifiants de Frigate (compte viewer `sync`) ne sont que dans l'environnement de House Sync.
- **Le direct** : House API relaie go2rtc (dans Frigate, `frigate:1984`, jamais publié) : `/stream` (MJPEG, un seul ffmpeg tant qu'un onglet regarde) et `/frame`. Le flux go2rtc `<flux>_mjpeg` est déclaré dans `frigate/config/config.yml`. L'API ne parle jamais à l'API de Frigate. Pour cela elle rejoint le réseau `sync_net`.
- **HTTPS** avec le certificat de la CA de la maison (`data/certs/rootCA.pem`, à installer une fois par appareil). La WebApp marche sur n'importe quel hôte du certificat (IP du PC ou `localhost`).
- **Secrets** dans `.env` (ignoré par git), modèle dans `.env.example`. Jamais de mot de passe dans le code, la doc ou les commits.
- **Données** dans `data/` (ignoré) : `data/frigate`, `data/backup`, `data/certs`. Tout ce que Frigate écrit à côté de `frigate/config/config.yml` est ignoré par git.
- Les fichiers de ce dossier apparaissent dans la vue « Code » du site : chaque fichier ajouté a une explication dans `src/components/CodeBrowser/constants.ts`.

## Commandes

```
docker compose up -d --build          # tout (re)construire et démarrer
docker compose up -d --build api      # après un changement dans api/ ou web/
docker compose up -d --build sync     # après un changement dans sync/ ou sync/web/
docker compose restart frigate        # après un changement de frigate/config/config.yml
docker compose logs -f sync           # ce que fait House Sync
```

Vérifications : `npm run typecheck` dans `api/`, `npm run typecheck && npm run lint && npm run build` dans `web/` et `sync/web/`, `npm run typecheck && npm run lint && npm run build-storybook` dans `ui/`. Les deux apps ont le même style : même `PageHeader`, mêmes `Tabs`, mêmes composants de `@house/ui`. Docker Desktop doit tourner (il est dans `%LOCALAPPDATA%\Programs\DockerDesktop`).

## Réglages (docker-compose.yml et .env)

`POLL_INTERVAL_SECONDS` (5 s, House Sync vers Frigate), `SNAPSHOT_INTERVAL_SECONDS` (60 s), `SNAPSHOT_RETENTION_DAYS` (7), `CERT_HOSTS` (hôtes du certificat), `FRIGATE_PUBLIC_URL`, `API_KEY`.
