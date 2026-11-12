# sync – House Sync

Script TypeScript Node 24 (`src/index.ts`, simple point d'entrée), sans dépendance. Le **seul programme qui écrit** sur le disque backup (`/data` = `data/backup`) : `events.db` (SQLite), `clips/<caméra>/<id>.mp4`, `snapshots/<caméra>/<t>.jpg`. Règles de la pile : `../CLAUDE.md`.

## Deux rôles

- **Tour de polling** toutes les `POLL_INTERVAL_SECONDS` (30 s par défaut, 5 s dans le compose) : étapes et réglages dans `src/CLAUDE.md`.
- **Page** (port 8081, HTTPS) : services de données derrière la session, plus la page React `web/dist` (`web/CLAUDE.md`).
- Journal des lampes Hue : en continu, hors polling (`../docs/hue.md` ; `hueStream.ts`, `hueLog.ts`, `hueOrigin.ts`).

## Services de la page

`web/dist` est public. Le reste exige la session (clé et cookie : `../docs/securite.md`).

- `POST /login` avec `HOUSE_KEY` = `API_KEY` : clé de moins de 8 caractères = aucune session ; 10 essais ratés par adresse en 15 min puis 429 (`attempts.ts`, `session.ts`).
- `GET`/`PUT /api/settings`, `/api/retention`, `/api/guest` : réglages (`src/CLAUDE.md`).
- `/api/overview` (`?part=database` : sans parcourir le disque), `/api/system`, `/api/specs`, `/api/docker`, `/api/network`, `/api/hue` (fiche publique du pont), `/api/hue-log`.
- `/api/camera-energy`, `/api/lamp-energy`, `/api/machine-energy` : alimentent l'arbre de consommation de la page Machine.
- `/api/table?name=&page=&size=`, `/api/clips?page=&size=`, `/files/…` (`Range` : 206, `range.ts`).
- Une erreur de requête répond 500 sans arrêter le service. Pagination bornée à 100 (`data.ts`).

## Découpe du code

- `index.ts` ne fait qu'assembler : il passe à `startApp` (`app.ts`) `process.env`, `fetch`, l'horloge et `process.exit`, puis branche `unhandledRejection`, `SIGTERM`, `SIGINT`.
- Modules à dépendances injectées via un `Context` (`context.ts` : base, config, réglages, `fetch`, `now`, `log`).
- `config.ts` : toutes les variables, lues une fois (exceptions : `specs.ts`, `network.ts`, `hue.ts` pour leurs chemins). Défauts = ceux du compose.
- `database.ts` : schéma, colonnes ajoutées après coup (`addColumn`), déclencheur et migration d'orientation.
- `poll.ts` (le tour), `recorder.ts`, `clips.ts`, `events.ts`, `snapshots.ts`, `snapshotCodes.ts`, `control.ts`, `eyes.ts`, `weather.ts`, `settings.ts`, `imports.ts` : détail dans `src/CLAUDE.md`.
- `page.ts` : session, services, fichiers du disque, `createPageServer`. `http.ts` : petits outils HTTP.
- **Copies assumées** : `sun.ts` (avec `api/src/lib/sun.ts`) et `cameraOrder.ts` (avec `api/src/lib/cameraOrder.ts`) : changer les deux.
- `specs.ts` et `system.ts` prennent un préfixe `root` pour `/proc` et `/sys` (essais).

## Tests

- `npm test` ; `npm run test:coverage` **échoue sous 100 %** (lignes, fonctions, branches).
- Essais à côté du code (`nom.test.ts`) : base `:memory:`, `fetch` et horloge injectés, rien hors `mkdtempSync`.
- `src/testing.ts` n'est pas du code du service. Exclus de la couverture : `index.ts`, `testing.ts`, `*.test.ts`.
- Une seule ligne `node:coverage ignore` : garde `stopped` de `connect` dans `hueStream.ts`.
- Vérifications : `npm run typecheck && npm run lint && npm run test:coverage`.
- Déploiement : `../docs/deploiement.md` ; à la main `docker compose up -d --build --no-deps sync`.
- Le log de chaque tour dit les caméras, événements copiés, clips récupérés, images gardées.
