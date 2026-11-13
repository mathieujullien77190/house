# stack – la pile en service sur le mini PC

Conteneurs Docker (`docker-compose.yml`) sur le mini PC (ACEMAGIC K1, Ubuntu Server), 4 Reolink RLC-810A sur le switch PoE ES208GP.

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : CA de la maison + certificat du mini PC | – |
| `go2rtc` | une connexion RTSP par caméra, partagée | interne |
| `motion` | enregistreur : segments (6 h), détection, clips MP4 | interne |
| `sync` | House Sync : copie clips et images, SQLite, sa page | 8081 |
| `api` | House API (Express) + WebApp compilée | 8080 |
| `site` | le site de la maison (schémas, Architecture, explications, vue Code, Storybook), dont les sources sont dans `site/`, compilé sur le PC, servi par nginx | 8082 |
| `guest` | page invité (direct léger) ; **éteinte par défaut** (profil `guest`) | 8090 |

Hors Docker, `power/` : deux services systemd (puissance CPU par RAPL, état des conteneurs) lus par House Sync.

## Quatre caméras, une unité

- Un seul `go2rtc` et un seul `motion` pour `voliere-exterieur`, `voliere-interieur`, `salon-de-jardin`, `voliere-toit` (ordre d'affichage : `sync/src/cameraOrder.ts`).
- Réglage : `CAMERAS` dans le compose ; flux dans `go2rtc/go2rtc.yaml` (huit par caméra, voir `go2rtc/CLAUDE.md`) ; adresse et compte dans `.env` (`CAMERA2_*`, `CAMERA3_*`, `CAMERA4_*`) ; port PoE dans `SWITCH_PORTS`.
- Segments et clips partagent les mêmes dossiers (`data/recordings/<caméra>`, `data/clips`).
- Plusieurs machines : `RECORDER_URLS` (House Sync) et `GO2RTC_URLS` (API), une unité go2rtc + motion par machine.

**Sur le mini PC, ce dossier s'appelle `~/house/code/phase0`** (ancien nom jamais renommé : `power/` et la session Claude de `remote/` en dépendent). Ce n'est pas un dépôt git, on y envoie les fichiers à la main. Copie lecture seule du dépôt : `~/house-repo`.

## Où est le détail

| Sujet | Fichier |
|---|---|
| Accès distant, pare-feu, SSH, clé et cookie, HTTPS, secrets | `docs/securite.md` |
| Déploiement (`deploy.sh`, retour arrière) | `docs/deploiement.md` |
| Le site servi sur le port 8082 | `site/CLAUDE.md` |
| Lumières Hue, `hue_events` | `docs/hue.md` |
| Session Claude du mini PC | `remote/README.md` (`claude-rules.md` n'est pas un `CLAUDE.md` exprès) |
| Un service | `CLAUDE.md` de son dossier |

Règle « le code fait foi » et mise à jour de la doc : `../../CLAUDE.md`.

## Règles

- **Santé** : `api`, `sync`, `motion`, `go2rtc`, `site` ont un `healthcheck` ; `guest` non (son port est fermé exprès quand elle est coupée). Les images n'embarquent pas les tests (`.dockerignore`). `docker builder prune -f` vide le cache de build sans toucher aux données.
- **Seul House Sync écrit** la base (`data/backup/events.db`), les clips et images sauvegardés. L'enregistreur écrit ses segments et clips.
- **L'API** n'écrit jamais la base ni le disque backup, et n'expose jamais la base brute. Elle écrit seulement, dans `data/house` :
  - positions des ampoules, liste des clips sauvegardés (House Sync efface les autres après 15 jours par défaut) ;
  - `zones.json` (donné à l'enregistreur par House Sync), `plan.json` (importé dans la table `plan`) ;
  - `heating.json` et `heating-log.jsonl` (importé dans `heating_log`).
  - Elle relaie go2rtc et commande switch PoE, pont Hue, prise.
- **Direct** : l'API relaie go2rtc (`go2rtc:1984`, jamais publié) : `/stream` (MJPEG, un ffmpeg tant qu'un onglet regarde) et `/frame`, via le réseau `sync_net`.
- **Page invité** : seulement si lancée ; `docker compose stop guest` la coupe, le bouton « Coupée » de House Sync ferme son port sans Docker. Réseau à part. Détail : `guest/CLAUDE.md`.
- **Mobile et bureau** : mobile de 360 à 1024 px (une colonne, cibles tactiles), bureau dès 1024 px (`lg:` seulement, jamais `sm:` ni `md:`). Pas de défilement horizontal de la page à 360 px : un contenu large défile dans son bloc.
- **Données** dans `data/` (ignoré) : `recordings`, `clips`, `backup`, `certs`, `power`, `house`, `guest` (interrupteur de la page invité), `guest-visits` (journal des visites). Les deux derniers sont à créer à la main avant le premier lancement.
- **`data/` est irremplaçable** : ne jamais supprimer, déplacer ni écraser un fichier (ni `events.db`) sans copie préalable et accord de l'utilisateur.
- Les fichiers de ce dossier sont expliqués dans `site/src/components/CodeBrowser/constants.ts`.

## Commandes

Déployer : `./deploy.sh`. À la main sur le mini PC :

```
docker compose up -d --build                  # tout
docker compose up -d --build api              # api/ ou web/
./deploy.sh site                              # le site de la racine (compilé sur le PC, pas sur le mini PC)
docker compose up -d --build --no-deps sync   # sync/ ou sync/web/ (sans --no-deps, motion redémarre aussi)
docker compose up -d --build motion           # motion/
docker compose restart go2rtc                 # go2rtc/go2rtc.yaml
docker compose logs -f motion                 # mouvements, clips
docker compose logs -f sync
```

Vérifications (typecheck et lint partout) :

- `npm run test:coverage` (seuil 100 %) dans `api/`, `sync/`, `sync/web/`, `web/`, `ui/`.
- `npm test` dans `motion/` et `guest/`.
- `npm run build` dans `web/` et `sync/web/`, `npm run build-storybook` dans `ui/`.

## Réglages

Variables dans `docker-compose.yml` (défauts commentés) et `.env.example` (secrets). Seuils de détection : `motion/CLAUDE.md`. Images, clips, cadence du direct : `sync/CLAUDE.md`.
