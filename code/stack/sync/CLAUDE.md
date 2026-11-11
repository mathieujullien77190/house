# sync – House Sync

Script TypeScript exécuté par Node 24 (`src/index.ts`, simple point d'entrée), sans dépendance, le **seul programme qui écrit** sur le disque backup (`/data`, soit `data/backup`) : `events.db` (SQLite), `clips/<caméra>/<id>.mp4`, `snapshots/<caméra>/<t>.jpg`. Les règles de la pile (qui écrit quoi, données irremplaçables) : `../CLAUDE.md`.

Il fait deux choses :

- **Un tour de polling** toutes les `POLL_INTERVAL_SECONDS` (30 s par défaut, 5 s dans le compose) : interroger les enregistreurs, copier clips et images, appliquer les réglages de la page, importer les fichiers des autres services, faire le ménage. Le détail de chaque étape et de chaque réglage : **`src/CLAUDE.md`**.
- **Une page** (port 8081, HTTPS) : les services de données derrière la session et la page React `sync/web` (`web/dist`, voir `web/CLAUDE.md`).

Le journal des lampes Hue (flux d'événements du pont, table `hue_events`) tourne en continu, hors du polling : `../docs/hue.md` (et `src/hueStream.ts`, `hueLog.ts`, `hueOrigin.ts`).

## Sa page

Sert `web/dist` en public. Derrière la session (clé et cookie : `../docs/securite.md`) : `POST /login` avec la clé `HOUSE_KEY` = `API_KEY` (une clé de moins de 8 caractères n'ouvre aucune session ; 10 essais ratés par adresse en 15 min puis 429, `src/attempts.ts` ; cookie signé, `src/session.ts`), puis :

- `GET` et `PUT /api/settings`, `GET` et `PUT /api/retention`, `GET` et `PUT /api/guest` (réglages et lien de la page invité : `src/CLAUDE.md`) ;
- `/api/overview` (`?part=database` : seulement la base, sans parcourir le disque backup, pour les onglets qui n'ont pas besoin de ses chiffres), `/api/system` (dont `cpu.perThread`), `/api/specs`, `/api/docker`, `/api/network`, `/api/hue` (la fiche publique du pont, sans clé : `src/hue.ts`), `/api/hue-log` (le journal des lampes : `../docs/hue.md`) ;
- `/api/camera-energy` (l'énergie estimée des caméras depuis le début, par caméra et au total, avec la puissance actuelle `watts` : `src/cameraEnergy.ts`) ;
- `/api/lamp-energy` (celle des lampes Hue, par lampe et au total, avec `watts` : `src/lampEnergy.ts`) ;
- `/api/machine-energy` (celle du mini PC, processeur seul, au total, avec `watts` : `src/machineEnergy.ts`) ; les trois alimentent l'arbre de consommation de la page Machine ;
- `/api/table?name=&page=&size=` (dont `hue_events`), `/api/clips?page=&size=` et `/files/…` (en-tête `Range` : réponse 206, `src/range.ts`).

Les petits outils HTTP (corps JSON borné, réponse JSON, entier de réglage) sont dans `src/http.ts`. Les lectures sont dans `src/data.ts` (fonctions pures, pagination bornée à 100). Une erreur dans une requête répond 500 sans arrêter le service.

## Découpe du code

`src/index.ts` ne fait qu'assembler : il donne à `startApp` (`app.ts`) le vrai environnement (`process.env`), le vrai `fetch`, la vraie horloge et `process.exit`, puis branche `unhandledRejection`, `SIGTERM` et `SIGINT`. Tout le reste est dans des modules à dépendances injectées (un **contexte** `Context`, `context.ts` : la base, la configuration, les réglages, `fetch`, `now` en millisecondes, `log`) :

- `config.ts` : `loadConfig(env)`, toutes les variables d'environnement lues une fois (aucun autre module ne lit `process.env`, sauf `specs.ts`, `network.ts` et `hue.ts` pour leurs chemins de la machine). Les valeurs par défaut sont celles du compose.
- `database.ts` : le schéma de `events.db`, les colonnes ajoutées après coup (`addColumn`), le déclencheur d'orientation et la migration unique des orientations (`initDatabase`).
- `settings.ts` : réglages par caméra et globaux (`cameraSettings`, `keepsClip`, durée de garde, cadence de la page invité).
- `recorder.ts` (requêtes vers les enregistreurs, `syncCameras`), `clips.ts` (copie des clips, copie légère, son, reprises, ménage quotidien de la durée de garde : clips, images, journal Hue, événements, fusions), `events.ts` (événements terminés, en cours, fusions), `control.ts` (détection, sensibilité, zone, cadence des directs go2rtc), `snapshots.ts` (une image par caméra à son rythme, de 5 s à 5 min), `weather.ts` (la pluie lue sur Open-Meteo toutes les 10 min pour le mode pluie des caméras ; position `HOUSE_LATITUDE` / `HOUSE_LONGITUDE`), `imports.ts` (plan de la maison, visites de la page invité, journal du chauffage, journal des volets), `poll.ts` (le tour de polling).
- `page.ts` : la page (session, services de données, fichiers du disque backup, `createPageServer` HTTP ou HTTPS).
- `app.ts` : `startApp(deps)` assemble tout et rend `stop`.
- Petits modules : `data.ts`, `http.ts`, `hueLog.ts`, `hueStream.ts`, `hueOrigin.ts`, `guestVisits.ts`, `heatingLog.ts`, `shutterLog.ts`, `cameraEnergy.ts`, `lampEnergy.ts`, `machineEnergy.ts`, `cameraOrder.ts` (l’ordre d’arrivée des caméras dans toutes les listes), `guestState.ts`, `plan.ts`, `zones.ts`, `savedClips.ts`, `sun.ts` (**copié** dans `api/src/lib/sun.ts` : si l’un change, changer l’autre), `power.ts`, `docker.ts`, `network.ts`, `specs.ts`, `system.ts` ; `specs.ts` et `system.ts` prennent en option un préfixe de `/proc` et `/sys` (`root`) pour les essais.

## Tests

`npm test` (`node --test "src/**/*.test.ts"`) ; `npm run test:coverage` mesure la couverture avec le moteur de Node et **échoue sous 100 %** (lignes, fonctions, branches). Les essais sont à côté du code (`nom.test.ts`), sans réseau ni vrai dossier hors de `mkdtempSync` : base `:memory:`, `fetch` et horloge injectés, `https.get` / `https.request` / `http.createServer` remplacés. `src/testing.ts` (contexte de test, fausses requêtes et réponses HTTP, faux pont Hue) n'est pas du code du service. Exclus de la couverture : `src/index.ts` (assemblage, sans logique : tout ce qu'il appelle est testé), `src/testing.ts` et les fichiers `*.test.ts`. Une seule ligne est marquée `node:coverage ignore` (`hueStream.ts`, garde `stopped` de `connect`, inatteignable aujourd'hui).

Vérifications : `npm run typecheck && npm run lint && npm run test:coverage`. Déploiement : `../docs/deploiement.md` ; à la main, `docker compose up -d --build --no-deps sync` (voir `../CLAUDE.md`). Les logs disent à chaque tour le nombre de caméras, d'événements copiés, de clips récupérés et d'images gardées.
