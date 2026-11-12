# api – House API

Express 5 en TypeScript, Node 24 (pas de compilation). Sert aussi la WebApp compilée (`web/dist`) sur le port 8080.

- Règles de la pile (qui écrit quoi, direct, données) : `../CLAUDE.md`.
- Clé, session par cookie, HTTPS, pare-feu : `../docs/securite.md`.
- Les routes une à une et les équipements : `src/routes/CLAUDE.md`.

## Rôle

- Lit `events.db` et le disque backup (lecture seule). **N'écrit jamais** la base ni le disque backup.
- Relaie go2rtc pour le direct : `GO2RTC_URLS` (un par enregistreur, le premier par défaut, `http://go2rtc:1984`, réseau `sync_net`).
- Pilote le PoE du switch, le pont Hue, la prise Kasa, les climatisations, les volets ; relaie l'enregistreur pour les clips à la main.
- Ses seules écritures : les ordres aux équipements et les fichiers de `STATE_DIR` (`/state`, volume `data/house`).
- `data/house` est à créer avec l'utilisateur qui lance Docker : le conteneur écrit en `node` (uid 1000).
- Contenu de `STATE_DIR` : positions des ampoules, clips sauvegardés, notes et emoji des clips, zones, repères, plan, garde de la prise, `heating.json` et `heating-log.jsonl`, volets.

## Fichiers clés

- `config.ts` : environnement validé (`API_KEY` de 8 caractères au moins) ; seul endroit qui lit les variables.
- `routes/index.ts` : monte les routes ; `SECURED_PATHS` liste ce qui exige la clé.
- `middleware/requireKey` : `X-House-Key` en temps constant, ou la session ; 10 clés fausses par adresse en 15 min, puis 429.
- `db/database.ts` : SQLite en lecture seule ; base pas prête : 503.
- `services/poe` : caméra vers port du switch, état en cache 3 s.
- `lib/*Client.ts` : clients des équipements (Hue, Kasa, switch ES208GP, climatisations Mitsubishi).
- `lib/backupFiles.ts` : envoi d'un fichier du disque backup, jamais hors du disque, avec `Range`.

## Copies assumées

À changer des deux côtés :

- `lib/sun.ts` et `sync/src/sun.ts`.
- `lib/cameraOrder.ts` et `sync/src/cameraOrder.ts`.

## Ajouter un service

- Requête dans `repositories/`, règle dans `services/`, fichier dans `routes/` monté dans `routes/index.ts`.
- Son chemin dans `SECURED_PATHS` s'il exige la clé.
- Sa ligne dans `ApiExplorer/constants.ts` de la WebApp.
- Son explication dans la vue « Code » du site (règle de `../../../CLAUDE.md`).

## Tests

- `npm test` (`node:test`, un `nom.test.ts` à côté de chaque fichier) ; `npm run test:coverage` échoue sous 100 % (hors `src/testing/` et `src/index.ts`).
- Aucun réseau réel : tous les équipements sont simulés.
- Vérifications : `npm run typecheck && npm run lint && npm run test:coverage`.
- Déploiement : `../docs/deploiement.md`.
