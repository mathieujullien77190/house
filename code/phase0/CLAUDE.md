# Phase 0 – la pile en service sur le PC

Quatre conteneurs Docker (`docker-compose.yml`), sur le PC de la maison, avec une Reolink RLC-810A branchée au switch PoE ES208GP :

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : crée la CA de la maison et le certificat du PC, puis s'arrête | – |
| `frigate` | lit la caméra (RTSP via go2rtc), détecte les personnes, enregistre sur mouvement | 8971 |
| `sync` | House Sync : copie les clips et une image par minute sur le disque backup, écrit SQLite, sert sa page | 8081 |
| `api` | House API (Express) + la WebApp compilée | 8080 |

Un CLAUDE.md par dossier : `certs/`, `frigate/`, `sync/`, `sync/web/`, `api/`, `web/`, `ui/` (le paquet `@house/ui` : les composants dumb des deux apps, avec un Storybook).

## Règles

- **Seul House Sync écrit** (SQLite `data/backup/events.db`, clips, images). L'API lit en lecture seule et n'appelle jamais Frigate. L'API n'expose jamais la base brute : c'est la page de House Sync qui la montre.
- **Deux connexions** : Frigate (cookie, port 8971) pour le direct et la dernière image, chargés par le navigateur ; la clé `API_KEY` (en-tête `X-House-Key`) pour l'API et la page de House Sync. Les identifiants de Frigate (compte viewer `sync`) ne sont que dans l'environnement de House Sync.
- **HTTPS partout, même hôte** : le cookie de Frigate est `SameSite=Lax`, la WebApp doit être ouverte sur le même scheme et le même hôte que `FRIGATE_PUBLIC_URL` (l'IP du PC, pas `localhost`). Le certificat vient de la CA de la maison (`data/certs/rootCA.pem`, à installer une fois par appareil).
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
