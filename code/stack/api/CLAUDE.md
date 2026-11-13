# api – House API

Express 5 en TypeScript, Node 24 (pas de compilation). Sert aussi la WebApp compilée (`web/dist`) sur le port 8080.

- Règles de la pile (qui écrit quoi, direct, données) : `../CLAUDE.md`.
- Clé, session par cookie, HTTPS, pare-feu : `../docs/securite.md`.
- Les routes une à une et les équipements : `src/routes/CLAUDE.md`.

## Rôle

- Lit `events.db` et le disque backup (lecture seule). **N'écrit jamais** la base ni le disque backup.
- Relaie go2rtc pour le direct : `GO2RTC_URLS` (un par enregistreur, le premier par défaut, `http://go2rtc:1984`, réseau `sync_net`).
- Pilote le PoE du switch, le pont Hue, la prise Kasa, les climatisations, les volets, la Freebox (WiFi, appareils) et la télécommande du Player ; relaie l'enregistreur pour les clips à la main.
- Ses seules écritures : les ordres aux équipements et les fichiers de `STATE_DIR` (`/state`, volume `data/house`).
- `data/house` est à créer avec l'utilisateur qui lance Docker : le conteneur écrit en `node` (uid 1000).
- Contenu de `STATE_DIR` : positions des ampoules, clips sauvegardés, notes et emoji des clips, zones, repères, plan, garde de la prise, `heating.json` et `heating-log.jsonl`, volets, `box-connections.jsonl`, `box-known.json` (la maison), `box-guests.json` (invités de la box) et `tv/` (certificat client et clé privée du Player appairé, **secret**, droits `0700` / `0600`).

## Fichiers clés

- `config.ts` : environnement validé (`API_KEY` de 8 caractères au moins) ; seul endroit qui lit les variables.
- `routes/index.ts` : monte les routes ; `SECURED_PATHS` liste ce qui exige la clé (`/openapi.json` et `/docs` compris).
- `openapi/` : `routes.ts` (liste de toutes les routes, source), `spec.ts` (document OpenAPI 3), `docs.ts` (`GET /openapi.json` et Swagger UI sur `GET /docs`, fichiers du paquet `swagger-ui-dist` servis par l'API, aucun CDN).
- `middleware/requireKey` : `X-House-Key` en temps constant, ou la session ; 10 clés fausses par adresse en 15 min, puis 429.
- `db/database.ts` : SQLite en lecture seule ; base pas prête : 503.
- `services/poe` : caméra vers port du switch, état en cache 3 s.
- `lib/freebox.ts` : client de la Freebox (session HMAC en cache, renouvelée) ; secret `FREEBOX_APP_TOKEN`.
- `services/boxWatcher.ts` : surveillant des invités de la box, créé dans `app.ts` et **lancé par `index.ts`** (`app.locals.boxWatcher.start()`, pas dans les tests). Détail : `src/routes/CLAUDE.md` (« Invités de la box »).
- `lib/tvRemote.ts` (+ `tvWire.ts`, `tvMessages.ts`, `tvKeys.ts`, `tvCert.ts`, `tvStore.ts`) : télécommande du Freebox Player (Android TV Remote v2) ; secret : le certificat client dans `STATE_DIR/tv` (voir `src/routes/CLAUDE.md`, « Télécommande TV »).
- `lib/*Client.ts` : clients des équipements (Hue, Kasa, switch ES208GP, climatisations Mitsubishi).
- `lib/backupFiles.ts` : envoi d'un fichier du disque backup, jamais hors du disque, avec `Range`.

## Swagger

- `GET /docs` (Swagger UI) et `GET /openapi.json` : **derrière la même protection** que le reste (cookie de session ou `X-House-Key`), jamais publics. Ouvrir d'abord la WebApp (le cookie est posé), puis `https://<adresse>:8080/docs` ; « Authorize » accepte aussi la clé (`X-House-Key`).
- Fichiers de Swagger UI : `/docs/swagger-ui.css` et `/docs/swagger-ui-bundle.js`, pris dans `node_modules/swagger-ui-dist`. L'image Docker supprime les `.map` et les bundles inutilisés.
- L'API ne pose aucun en-tête `Content-Security-Policy` : la page `/docs` a un script en ligne, à adapter si une CSP est ajoutée un jour.

## Copies assumées

À changer des deux côtés :

- `lib/sun.ts` et `sync/src/sun.ts`.
- `lib/cameraOrder.ts` et `sync/src/cameraOrder.ts`.

## Ajouter un service

- Requête dans `repositories/`, règle dans `services/`, fichier dans `routes/` monté dans `routes/index.ts`.
- Son chemin dans `SECURED_PATHS` s'il exige la clé.
- Sa ligne dans `openapi/routes.ts` (chemin au format `/x/{id}`, méthode, groupe, `secured`, paramètres, corps, codes d'erreur) : `openapi/docs.test.ts` échoue si une route montée n'est pas décrite, si une route décrite n'existe pas ou si `secured` contredit `SECURED_PATHS`.
- Son explication dans la vue « Code » du site (règle de `../../../CLAUDE.md`).

## Tests

- `npm test` (`node:test`, un `nom.test.ts` à côté de chaque fichier) ; `npm run test:coverage` échoue sous 100 % (hors `src/testing/` et `src/index.ts`).
- Aucun réseau réel : tous les équipements sont simulés.
- Vérifications : `npm run typecheck && npm run lint && npm run test:coverage`.
- Déploiement : `../docs/deploiement.md`.
