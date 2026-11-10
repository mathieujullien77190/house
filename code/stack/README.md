# stack

La pile du mini PC : go2rtc (les flux des caméras), motion (l'enregistreur), House Sync, et House API qui sert la WebApp.

```
stack/
├── docker-compose.yml   les conteneurs, plus l'éphémère des certificats
├── .env.example         les variables à copier dans .env
├── certs/               la CA de la maison et le certificat du mini PC (make-certs.sh)
├── go2rtc/              go2rtc.yaml : les flux de chaque caméra (principal, léger, MJPEG ; voir go2rtc/CLAUDE.md)
├── motion/              l'enregistreur : segments, détection de mouvement, clips, petite API pour House Sync
├── sync/                House Sync (lit l'enregistreur, copie les clips, images par minute, SQLite)
│   └── web/             sa page : projet Vite + React + TypeScript (tables paginées, clips)
├── api/                 House API : Express (config, middlewares, routes, services, dépôts) ; n'écrit jamais la base
├── ui/                  @house/ui : les composants dumb des deux apps, avec un Storybook
└── web/                 WebApp : projet Vite + React + TypeScript (la clé, puis quatre onglets)
```

## WebApp

Quatre onglets après la clé : **Caméras** (mosaïque du direct, puis par caméra : direct MJPEG, frise des
événements qu'on fait glisser, clip de l'événement cliqué, image gardée à l'instant cliqué, bouton PoE),
**Lumière** (les lampes Philips Hue, le plan de la maison, les automatisations du pont), **Prise** (la prise connectée) et
**API** (chaque service, un clic montre sa réponse JSON). Détail : `web/CLAUDE.md`.

## Page de House Sync

Pour contrôler ce que fait House Sync : `https://<adresse du mini PC>:8081`, la même clé que la WebApp. House Sync
sert cette page lui-même (React, dossier `sync/web`, rechargée toutes les 15 s sauf média ouvert) : les totaux,
sa base SQLite table par table (paginée, une description par table), les clips du disque backup, et un panneau
fixe où un clip ou une image s'ouvre au clic (lecture directe, Fermer l'arrête). L'API n'expose jamais la base
brute. Développement : `cd sync/web && npm install && npm run dev` (HTTPS sur 5181 avec le certificat de la
maison, services relayés vers House Sync).

## House API

Express 5, en TypeScript exécuté par Node 24 (`npm run typecheck` pour vérifier) : `config.ts` (environnement
validé), `app.ts` (assemblage), `middleware/` (clé, session, erreurs), `routes/` (un fichier par service),
`services/` (règles, dont le relais de go2rtc), `repositories/` (SQL), `db/` (SQLite en lecture seule),
`lib/backupFiles.ts` (envoi des fichiers du disque backup, avec la reprise partielle pour la vidéo). Les routes
derrière la clé sont listées dans `routes/index.ts` ; welcome et les fichiers de la WebApp restent publics.

## L'enregistreur (motion)

Le seul composant qui détecte et enregistre (voir `motion/CLAUDE.md`). Par caméra : il copie le flux principal
par segments de 10 s (sans transcodage, 6 h gardées), détecte le mouvement sur le flux léger (différence entre
images grises 160×90, 5 par seconde), ouvre un événement au début d'un mouvement et le ferme à sa fin, puis
assemble les segments en un clip MP4. Son API interne (jamais publiée) a la forme que House Sync lit :
`/api/config`, `/api/events`, `/api/events/<id>/clip.mp4`, `/api/<caméra>/latest.jpg`. Régler : voir les
variables du compose (`PIXEL_THRESHOLD`, `AREA_THRESHOLD`, `MIN_MOTION_SECONDS`, `END_SECONDS`, `RETENTION_HOURS`).

Mêmes conventions que le site pour les apps React : un dossier par composant (`Nom.tsx`, `UI.tsx`,
`helpers.ts`, `constants.ts`, `types.ts`, `index.ts`), Tailwind, TypeScript strict.

```
cd web
npm install
npm run dev        # http://localhost:5180, les services relayés vers https://localhost:8080
npm run typecheck && npm run lint && npm run build
```

L'image Docker de l'API compile la WebApp (`npm ci`, `vite build`) et sert le dossier `dist` :
`docker compose up -d --build api` après un changement.

## Démarrage

1. Copier `.env.example` en `.env` et remplir les valeurs : mot de passe de la Reolink `voliere-exterieur`
   (`REOLINK_PASSWORD`), clé secrète de l'API (`API_KEY`), hôtes du certificat (`CERT_HOSTS` : l'IP du mini PC,
   fixée par un bail DHCP statique sur la box), les caméras suivantes (`CAMERA2_*`, `CAMERA3_*`, `CAMERA4_*`), le compte du switch
   (`SWITCH_*`) et le pont Hue (`HUE_*`). Sans ces caméras, le switch, la prise ou le pont Hue, la fonction correspondante est désactivée.
2. Mettre l'adresse IP de la Reolink `voliere-exterieur` dans `go2rtc/go2rtc.yaml` (bail DHCP statique sur la box) ;
   celle de `voliere-interieur` vient de `CAMERA2_IP`.
3. `docker compose up -d --build`
4. `docker compose logs motion` doit afficher « Enregistreur : voliere-exterieur, voliere-interieur », puis une ligne à chaque début et
   chaque fin de mouvement. `docker compose logs sync` affiche, toutes les 5 secondes, le nombre de caméras
   et de nouveaux événements. Un clip arrive une vingtaine de secondes après la fin du mouvement.
5. Installer la CA de la maison sur chaque appareil, une fois : le fichier `data/certs/rootCA.pem`, ou son
   téléchargement `https://<adresse du mini PC>:8080/rootCA.crt` (à ouvrir tel quel sur Windows, où l'extension
   `.crt` est nécessaire).
   Windows : double-clic, « Installer un certificat », utilisateur actuel, magasin « Autorités de
   certification racines de confiance ». Android : Paramètres > Sécurité > Chiffrement et identifiants >
   Installer un certificat > Certificat CA. Puis fermer et rouvrir le navigateur.
6. WebApp : `https://<adresse du mini PC>:8080` (ou `localhost`), entrer la clé de l'API. Le direct vient de go2rtc,
   relayé par l'API.

## À savoir

- Ports publiés : 8080 (API et WebApp), 8081 (page de House Sync). Les ports de go2rtc (1984, 8554) et l'API de
  l'enregistreur (8080 interne) ne sont jamais publiés.
- Une seule clé : celle de l'API (en-tête `X-House-Key`, puis un cookie de session pour le direct, que
  l'API relaie depuis go2rtc).
- L'API ne lit que SQLite et le disque backup (elle ne les écrit jamais) et commande le pont Hue, la prise et le switch. House Sync est le seul à écrire dans la base.
- Le direct : `/stream?camera=` est un flux MJPEG (une requête qui ne se termine pas, les images arrivent
  toutes seules ; la cadence se règle dans House Sync, pour le PC et pour le téléphone), relayé par l'API depuis go2rtc (`go2rtc:1984`, interne). Le
  flux `<flux>_mjpeg` est déclaré dans `go2rtc/go2rtc.yaml`.
- Les certificats : `data/certs` contient la CA (`rootCA.pem`, sa clé `rootCA-key.pem` qui ne sort jamais du
  PC) et le certificat du mini PC, signé par elle, que l'API et House Sync servent. Sans la CA installée, le
  navigateur affiche un avertissement ; avec, le cadenas est vert. Le certificat est refait automatiquement si
  `CERT_HOSTS` change ou à moins de 30 jours de son expiration (`docker compose up -d`).
- Les données sont dans `data/` (ignoré par git) : `data/recordings` (les segments de l'enregistreur, 6 h),
  `data/clips` (les clips de l'enregistreur, dans `clips/`, et son état des événements `events.json`), `data/backup` pour la base `events.db`,
  les clips copiés (`clips/<caméra>/<id>.mp4`) et les images par minute (`snapshots/<caméra>/<t>.jpg`). Ces
  données sont irremplaçables : House Sync ajoute lui-même les colonnes manquantes à une base existante, donc
  **ne supprime jamais `events.db`** sans en avoir fait une copie.
- L'enregistreur garde 6 h de segments (le 4K en continu ferait ~65 Go par jour) : si House Sync est arrêté, il
  rattrape tout au redémarrage tant que les clips existent (les clips aussi sont gardés 6 h). Entre deux
  événements, c'est l'image de House Sync qu'on voit (une par minute par défaut, réglable ; 7 jours
  gardés : `SNAPSHOT_INTERVAL_SECONDS`, `SNAPSHOT_RETENTION_DAYS` dans docker-compose.yml). Les images de la
  période d'arrêt, elles, sont perdues.
