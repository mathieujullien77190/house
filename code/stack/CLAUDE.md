# stack – la pile en service sur le mini PC

Des conteneurs Docker (`docker-compose.yml`) sur le mini PC de la maison (ACEMAGIC K1, Ubuntu Server), avec deux Reolink RLC-810A branchées au switch PoE ES208GP :

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : crée la CA de la maison et le certificat du mini PC, puis s'arrête | – |
| `go2rtc` | une seule connexion RTSP vers chaque caméra, qu'il partage (RTSP interne, MJPEG, image à l'instant) | interne |
| `motion` | l'enregistreur : segments du flux principal (6 h), détection de mouvement sur le flux léger, clips MP4, petite API pour House Sync | interne |
| `sync` | House Sync : copie les clips et une image par minute sur le disque backup, écrit SQLite, sert sa page | 8081 |
| `api` | House API (Express) + la WebApp compilée | 8080 |

**Deux caméras, une seule unité.** Un seul `go2rtc` et un seul `motion` s'occupent des deux Reolink (`portail` et `camera2`) : `CAMERAS: portail,camera2` dans le compose, les six flux (`<nom>_main`, `<nom>_sub`, `<nom>_sub_mjpeg`) déclarés dans `go2rtc/go2rtc.yaml`, l'adresse et le compte de `camera2` dans `.env` (`CAMERA2_IP`, `CAMERA2_USER`, `CAMERA2_PASSWORD`). Les segments et les clips des deux caméras sont dans les mêmes dossiers (`data/recordings/<caméra>`, `data/clips`). House Sync sait en revanche interroger **plusieurs** enregistreurs (`RECORDER_URLS`) et l'API relayer plusieurs go2rtc (`GO2RTC_URLS`) : une unité `go2rtc` + `motion` par machine, pour le jour où il y aura d'autres Pi.

Sur l'hôte (hors Docker), `power/` : deux services systemd (la puissance du processeur par RAPL, l'état des conteneurs Docker) qui écrivent un fichier que House Sync lit.

**Accès distant.** Les applications ne sont jamais ouvertes sur internet. Hors de la maison, un téléphone ouvre un tunnel **WireGuard** vers la Freebox (serveur VPN intégré, un utilisateur WireGuard par appareil, un seul port UDP ouvert sur la box) : il reçoit une adresse du réseau `192.168.27.0/24` et voit le mini PC à **`192.168.27.139`** (`https://192.168.27.139:8080` pour la WebApp, `:8081` pour House Sync ; cette adresse est dans `CERT_HOSTS`). Le pare-feu du mini PC n'autorise que le réseau de la maison et ce réseau VPN. Le dossier peut s'appeler autrement sur le mini PC : sa copie y est dans `~/house/code/phase0` (ancien nom de ce dossier, à renommer avec les chemins des deux services de `power/`).

Un CLAUDE.md par dossier : `certs/`, `power/`, `go2rtc/`, `motion/`, `sync/`, `sync/web/`, `api/`, `web/`, `ui/` (le paquet `@house/ui` : les composants dumb des deux apps, avec un Storybook).

## Règles

- **Seul House Sync écrit** dans la base (SQLite `data/backup/events.db`, clips, images). L'enregistreur écrit ses propres segments et clips (`data/recordings`, `data/clips`). L'API lit en lecture seule, relaie go2rtc (pour le direct) et ne parle au switch que pour couper ou rendre le PoE d'une caméra. L'API n'expose jamais la base brute : c'est la page de House Sync qui la montre.
- **Une seule clé** : `API_KEY` (en-tête `X-House-Key`) pour l'API et la page de House Sync. La saisie de la clé ouvre une **session par cookie** (`GET /auth` pour l'API, `POST /login` pour House Sync) : un jeton signé avec la clé (HMAC) et daté, valable **30 jours**, HttpOnly et Secure, rien en mémoire (il survit à un redémarrage). Le navigateur ne garde jamais la clé : une page rouverte se reconnecte avec le cookie, sans qu'on la ressaisisse. Changer `API_KEY` invalide tous les cookies ; « Oublier la clé » ou « Quitter » efface celui du navigateur. Le cookie sert aussi à ce qu'une balise `<img>` ou `<video>` charge sans en-tête, dont le direct.
- **Le direct** : House API relaie go2rtc (`go2rtc:1984`, jamais publié) : `/stream` (MJPEG, un seul ffmpeg tant qu'un onglet regarde) et `/frame`. Le flux go2rtc `<flux>_mjpeg` est déclaré dans `go2rtc/go2rtc.yaml`. Pour cela l'API rejoint le réseau `sync_net`.
- **Rien n'est publié** à part l'API (8080) et la page de House Sync (8081) : go2rtc et l'API de l'enregistreur n'ont pas de mot de passe et ne sont joignables que par les autres conteneurs.
- **Pare-feu du mini PC** (`ufw`, entrant refusé par défaut) : SSH (22), 8080 et 8081 ne sont ouverts qu'au réseau de la maison (`192.168.1.0/24`, et en IPv6 son préfixe local et les adresses `fe80::/10`) et au VPN WireGuard de la Freebox (`192.168.27.0/24`, l'adresse que reçoit un téléphone connecté). Docker contourne `ufw` pour les ports qu'il publie en IPv4 : un bloc `DOCKER-USER` en fin de `/etc/ufw/after.rules` refuse 8080 et 8081 à tout ce qui n'est ni du réseau de la maison ni de son VPN. Rien n'est redirigé sur la Freebox ; pour joindre les apps de l'extérieur, passer par le VPN WireGuard de la Freebox (un utilisateur de type WireGuard par appareil) ou Tailscale, jamais par une redirection de ports.
- **HTTPS** avec le certificat de la CA de la maison (`data/certs/rootCA.pem`, à installer une fois par appareil). Pour un téléphone, l'API propose le certificat **public** au téléchargement : `https://<adresse>:8080/rootCA.crt` (jamais la clé `rootCA-key.pem`). La WebApp marche sur n'importe quel hôte du certificat (IP du PC ou `localhost`).
- **Mobile et bureau** : les deux apps (WebApp et page de House Sync) ont une mise en page **mobile de 360 à 1024 px** (une colonne, boutons et onglets plus hauts pour le doigt) et une mise en page **bureau dès 1024 px** (le point de rupture `lg:` de Tailwind, jamais `sm:` ni `md:`). Aucun défilement horizontal de la page à 360 px : un contenu large (tableau, code, frise) défile dans son propre bloc.
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

Vérifications : `npm run typecheck` dans `api/`, `npm run typecheck && npm test` dans `motion/`, `npm run typecheck && npm run lint && npm run build` dans `web/` et `sync/web/`, `npm run typecheck && npm run lint && npm run build-storybook` dans `ui/`. Les deux apps ont le même style : même `PageHeader`, mêmes `Tabs`, mêmes composants de `@house/ui`.

## Réglages (docker-compose.yml et .env)

`POLL_INTERVAL_SECONDS` (5 s, House Sync vers l'enregistreur), `SNAPSHOT_INTERVAL_SECONDS` (60 s), `SNAPSHOT_RETENTION_DAYS` (7), `RETENTION_HOURS` (6, l'enregistreur), `CERT_HOSTS` (hôtes du certificat), `API_KEY`, `REOLINK_PASSWORD`, `SWITCH_USER` et `SWITCH_PASSWORD` (le compte de la page web du switch, pour couper le PoE d'une caméra). Les seuils de la détection de mouvement : `PIXEL_THRESHOLD`, `AREA_THRESHOLD`, `START_FRAMES`, `END_SECONDS` (voir `motion/CLAUDE.md`).
