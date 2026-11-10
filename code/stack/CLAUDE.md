# stack – la pile en service sur le mini PC

Des conteneurs Docker (`docker-compose.yml`) sur le mini PC de la maison (ACEMAGIC K1, Ubuntu Server), avec deux Reolink RLC-810A branchées au switch PoE ES208GP :

| Conteneur | Rôle | Port |
|---|---|---|
| `certs` | éphémère : crée la CA de la maison et le certificat du mini PC, puis s'arrête | – |
| `go2rtc` | une seule connexion RTSP vers chaque caméra, qu'il partage (RTSP interne, MJPEG, image à l'instant) | interne |
| `motion` | l'enregistreur : segments du flux principal (6 h), détection de mouvement sur le flux léger, clips MP4, petite API pour House Sync | interne |
| `sync` | House Sync : copie les clips et les images sur le disque backup (selon les réglages de sa page), écrit SQLite, sert sa page | 8081 |
| `api` | House API (Express) + la WebApp compilée | 8080 |
| `guest` | la page invité : le direct léger des caméras, pour quelqu'un à qui on donne un lien ; **éteinte par défaut** (profil `guest`) | 8090 |

Sur l'hôte (hors Docker), `power/` : deux services systemd (la puissance du processeur par RAPL, l'état des conteneurs Docker) qui écrivent un fichier que House Sync lit.

**Quatre caméras, une seule unité.** Un seul `go2rtc` et un seul `motion` s'occupent des quatre Reolink (`voliere-interieur`, `voliere-exterieur`, `salon-de-jardin` et `voliere-toit`, dans l'ordre de leur arrivée : `sync/src/cameraOrder.ts`) : `CAMERAS: voliere-exterieur,voliere-interieur,salon-de-jardin,voliere-toit` dans le compose, les flux de chacune (huit par caméra : `go2rtc/CLAUDE.md`) déclarés dans `go2rtc/go2rtc.yaml`, l'adresse et le compte des trois dernières dans `.env` (`CAMERA2_*`, `CAMERA3_*`, `CAMERA4_*` : `IP`, `USER`, `PASSWORD`). Chaque caméra a son port PoE (`SWITCH_PORTS`, le port 8 pour `voliere-toit`). Les segments et les clips des caméras sont dans les mêmes dossiers (`data/recordings/<caméra>`, `data/clips`). House Sync sait interroger **plusieurs** enregistreurs (`RECORDER_URLS`) et l'API relayer plusieurs go2rtc (`GO2RTC_URLS`) : une unité `go2rtc` + `motion` par machine, pour d'autres machines.

**Sur le mini PC, ce dossier s'appelle `~/house/code/phase0`** (ancien nom, jamais renommé : les chemins des deux services de `power/` et la session Claude de `remote/` en dépendent). Ce n'est pas un dépôt git : on y envoie les fichiers à la main. Une copie en lecture seule du dépôt, pour la documentation, est dans `~/house-repo`.

## Où est le détail

| Sujet | Fichier |
|---|---|
| Accès distant (VPN), pare-feu, SSH, clé et cookie, HTTPS, secrets | `docs/securite.md` |
| Déploiement (`deploy.sh` à la main par SSH, retour arrière) | `docs/deploiement.md` |
| Lumières Hue, règles du pont, journal `hue_events` | `docs/hue.md` |
| Session Claude permanente du mini PC | `remote/README.md` (`claude-rules.md` : les règles qu'elle charge, volontairement pas nommé `CLAUDE.md` pour ne pas s'appliquer à qui édite ce dépôt) |
| Un service | le `CLAUDE.md` de son dossier : `certs/`, `power/`, `go2rtc/`, `motion/`, `sync/`, `sync/web/`, `api/`, `web/`, `guest/`, `ui/` (le paquet `@house/ui` : composants dumb des deux apps, avec un Storybook) |

La règle « le code fait foi » et la mise à jour de la doc : `../../CLAUDE.md`.

## Règles

- **Santé des conteneurs** : `api`, `sync`, `motion` et `go2rtc` ont un `healthcheck` dans `docker-compose.yml` (`docker compose ps` dit `healthy`) ; `guest` n'en a pas, son port est fermé exprès quand sa page est coupée. Les images n'embarquent pas les tests (`.dockerignore`). Le cache de build de Docker grossit à chaque déploiement : `docker builder prune -f` sur le mini PC le vide sans toucher aux données.
- **Seul House Sync écrit** dans la base (SQLite `data/backup/events.db`, clips, images). L'enregistreur écrit ses propres segments et clips (`data/recordings`, `data/clips`). L'API n'écrit jamais la base ni le disque backup : elle les lit, relaie go2rtc (pour le direct), garde les positions des ampoules, la liste des clips sauvegardés (`data/house`, lue par House Sync, qui efface les clips non sauvegardés après la durée de garde, 15 jours par défaut), les zones de surveillance du mouvement (`zones.json`, que House Sync donne à l'enregistreur), le plan de la maison (`plan.json`, que House Sync importe dans la table `plan`), les réglages du chauffage automatique de la prise (`heating.json`) et son journal (`heating-log.jsonl`, que House Sync importe dans la table `heating_log`), et commande le switch (PoE), le pont Hue et la prise. L'API n'expose jamais la base brute : c'est la page de House Sync qui la montre.
- **Le direct** : House API relaie go2rtc (`go2rtc:1984`, jamais publié) : `/stream` (MJPEG, un seul ffmpeg tant qu'un onglet regarde) et `/frame`. Le flux go2rtc `<flux>_mjpeg` est déclaré dans `go2rtc/go2rtc.yaml`. Pour cela l'API rejoint le réseau `sync_net`.
- **La page invité** (`guest/`, port 8090) n'existe que si on la lance (`docker compose up -d --build guest`) ; `docker compose stop guest` la coupe, le bouton « Coupée » de House Sync (onglet Réglages) ferme son port sans Docker. Elle a son réseau Docker (avec go2rtc seulement). Détail : `guest/CLAUDE.md`.
- **Mobile et bureau** : les deux apps (WebApp et page de House Sync) ont une mise en page **mobile de 360 à 1024 px** (une colonne, boutons et onglets plus hauts pour le doigt) et une mise en page **bureau dès 1024 px** (le point de rupture `lg:` de Tailwind, jamais `sm:` ni `md:`). Aucun défilement horizontal de la page à 360 px : un contenu large (tableau, code, frise) défile dans son propre bloc.
- **Données** dans `data/` (ignoré) : `data/recordings`, `data/clips`, `data/backup`, `data/certs`, `data/power`, `data/house`, `data/guest` (l'interrupteur de la page invité, écrit par House Sync) et `data/guest-visits` (le journal des visites, écrit par la page invité, importé par House Sync) ; ces deux derniers dossiers sont à créer par l'utilisateur de la machine avant le premier lancement. Elles sont **irremplaçables** : ne jamais supprimer, déplacer ni écraser un fichier de `data/` (ni `events.db`) sans une copie faite avant et l'accord de l'utilisateur.
- Les fichiers de ce dossier apparaissent dans la vue « Code » du site : explications dans `src/components/CodeBrowser/constants.ts`.

## Commandes

Déployer : `./deploy.sh` (voir `docs/deploiement.md`) ; à la main sur le mini PC :

```
docker compose up -d --build          # tout (re)construire et démarrer
docker compose up -d --build api      # après un changement dans api/ ou web/
docker compose up -d --build --no-deps sync   # après un changement dans sync/ ou sync/web/ (sans --no-deps, motion redémarre aussi)
docker compose up -d --build motion   # après un changement dans motion/
docker compose restart go2rtc         # après un changement de go2rtc/go2rtc.yaml
docker compose logs -f motion         # les débuts et fins de mouvement, les clips
docker compose logs -f sync           # ce que fait House Sync
```

Vérifications (typecheck et lint partout) : `npm run test:coverage` dans `api/`, `sync/`, `sync/web/`, `web/` et `ui/` (seuil de 100 %), `npm test` dans `motion/` et `guest/`, `npm run build` dans `web/` et `sync/web/`, `npm run build-storybook` dans `ui/`. Les deux apps ont le même style : même `PageHeader`, mêmes `Tabs`, mêmes composants de `@house/ui`.

## Réglages

Toutes les variables sont dans `docker-compose.yml` (valeurs par défaut commentées) et `.env.example` (secrets). Les seuils de détection : `motion/CLAUDE.md` ; les images, les clips et la cadence du direct : `sync/CLAUDE.md`.
