# Phase 0

La pile de la phase 0, sur le PC : Frigate, House Sync, et House API qui sert la WebApp.

```
phase0/
├── docker-compose.yml   les trois conteneurs, plus le conteneur éphémère des certificats
├── .env.example         les variables à copier dans .env
├── certs/               la CA de la maison et le certificat du PC (make-certs.sh)
├── frigate/             configuration de Frigate
├── sync/                House Sync (polling de Frigate, copie des clips, images par minute, SQLite)
│   └── web/             sa page : projet Vite + React + TypeScript (tables paginées, clips)
├── api/                 House API : Express (config, middlewares, routes, services, dépôts), lecture seule
└── web/                 WebApp : projet Vite + React + TypeScript (la clé, puis deux onglets)
```

## WebApp

Deux onglets après la clé : **Caméras** (nom, direct MJPEG, frise des événements sur 10 min à 7 jours qu'on
fait glisser, clip de l'événement cliqué, image gardée à l'instant cliqué),
**API** (chaque service, un clic montre sa réponse JSON).

## Page de House Sync

Pour contrôler ce que fait House Sync : `https://<adresse du PC>:8081`, la même clé que la WebApp. House Sync
sert cette page lui-même (React, dossier `sync/web`, rechargée toutes les 15 s sauf média ouvert) : les totaux,
sa base SQLite table par table (paginée, une description par table), les clips du disque backup, et un panneau
fixe où un clip ou une image s'ouvre au clic (lecture directe, Fermer l'arrête). L'API n'expose jamais la base
brute. Développement : `cd sync/web && npm install && npm run dev` (HTTPS sur 5181 avec le certificat de la
maison, services relayés vers House Sync).

## House API

Express 5, en TypeScript exécuté par Node 24 (`npm run typecheck` pour vérifier) : `config.ts` (environnement
validé), `app.ts` (assemblage), `middleware/` (clé, erreurs), `routes/` (un fichier par service), `services/`
(règles), `repositories/` (SQL), `db/` (SQLite en lecture seule), `lib/backupFiles.ts` (envoi des fichiers du
disque backup, avec la reprise partielle pour la vidéo). Les routes derrière la clé sont listées dans
`routes/index.ts` ; welcome et les fichiers de la WebApp restent publics.
Mêmes conventions que le site : un dossier par composant (`Nom.tsx`, `UI.tsx`, `helpers.ts`, `constants.ts`,
`types.ts`, `index.ts`), Tailwind, TypeScript strict.

```
cd web
npm install
npm run dev        # http://localhost:5180, les services relayés vers https://localhost:8080
npm run typecheck && npm run lint && npm run build
```

L'image Docker de l'API compile la WebApp (`npm ci`, `vite build`) et sert le dossier `dist` :
`docker compose up -d --build api` après un changement.

## Démarrage

1. Copier `.env.example` en `.env` et remplir les valeurs : mot de passe de la Reolink, adresse de Frigate
   vue du navigateur (`FRIGATE_PUBLIC_URL`, l'adresse du PC sur le réseau), clé secrète de l'API (`API_KEY`),
   hôtes du certificat (`CERT_HOSTS` : l'IP du PC, fixée par un bail DHCP statique sur la box).
2. Mettre l'adresse IP de la Reolink dans `frigate/config/config.yml` (bail DHCP statique sur la box).
3. `docker compose up -d --build`
4. Frigate : `https://localhost:8971`. Au premier démarrage, le mot de passe `admin` est dans les logs
   (`docker compose logs frigate`). Le changer, puis créer un compte `sync` de rôle viewer et mettre son mot
   de passe dans `.env` (`SYNC_FRIGATE_PASSWORD`), puis `docker compose up -d sync`.
5. House Sync : `docker compose logs sync` doit afficher « Connecté à Frigate (sync) » puis, toutes les
   5 secondes, le nombre de caméras et de nouveaux événements. Un événement n'arrive qu'une fois terminé
   (la personne est sortie du champ) et son clip prêt : compter quelques secondes avant de le voir.
6. Installer la CA de la maison sur chaque appareil, une fois : le fichier `data/certs/rootCA.pem`.
   Windows : double-clic, « Installer un certificat », utilisateur actuel, magasin « Autorités de
   certification racines de confiance ». Android : Paramètres > Sécurité > Chiffrement et identifiants >
   Installer un certificat > Certificat CA. Puis fermer et rouvrir le navigateur.
7. WebApp : `https://<adresse du PC>:8080` (ou `localhost`), entrer la clé de l'API. Le direct vient de go2rtc,
   relayé par l'API : aucune connexion à Frigate dans le navigateur.

## À savoir

- Ports publiés : 8971 (Frigate), 8080 (API et WebApp), 8081 (page de House Sync). Le port 5000 de Frigate
  reste interne.
- Une seule clé : celle de l'API (en-tête `X-House-Key`, puis un cookie de session pour le direct, que
  l'API relaie depuis go2rtc). Frigate (8971) ne sert plus qu'à l'administration.
- L'API ne lit que SQLite et le disque backup. Les identifiants de Frigate ne sont que dans House Sync.
- Le direct : `/stream?camera=` est un flux MJPEG (une requête qui ne se termine pas, les images arrivent
  toutes seules, ~5 par seconde, flux léger), relayé par l'API depuis go2rtc (`frigate:1984`, interne). Le
  flux `<flux>_mjpeg` est déclaré dans `frigate/config/config.yml`.
- Les certificats : `data/certs` contient la CA (`rootCA.pem`, sa clé `rootCA-key.pem` qui ne sort jamais du
  PC) et le certificat du PC, signé par elle, que l'API et Frigate servent tous les deux. Sans la CA
  installée, le navigateur affiche un avertissement ; avec, le cadenas est vert. Le certificat est refait
  automatiquement si `CERT_HOSTS` change ou à moins de 30 jours de son expiration (`docker compose up -d`).
- Les données sont dans `data/` (ignoré par git) : `data/frigate` pour Frigate, `data/backup` pour la base
  `events.db`, les clips (`clips/<caméra>/<id>.mp4`) et les images par minute (`snapshots/<caméra>/<t>.jpg`).
  Si le schéma de la base change, supprimer `events.db`.
- Frigate n'enregistre que sur mouvement (`record.continuous: 0 jour` ; le 4K en continu ferait ~65 Go par
  jour) et ne garde que 6 h (`0.25` jour), le temps que House Sync copie les clips : si House Sync est arrêté,
  il rattrape tout au redémarrage tant que Frigate a encore les clips. Entre deux événements, c'est l'image par
  minute de House Sync qu'on voit (~60 Mo par jour et par caméra, 7 jours gardés : `SNAPSHOT_INTERVAL_SECONDS`,
  `SNAPSHOT_RETENTION_DAYS` dans docker-compose.yml). Les images de la période d'arrêt, elles, sont perdues.
- Frigate écrit sa base et ses secrets à côté de `config.yml` : tout y est ignoré par git sauf la config.
