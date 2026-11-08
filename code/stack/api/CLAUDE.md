# api – House API

Express 5 en TypeScript exécuté par Node 24 (pas de compilation ; `npm run typecheck` vérifie). Sert aussi la WebApp compilée (`web/dist`, copiée dans l'image) sur le port 8080. Les règles de la pile (qui écrit quoi, le direct, les données) : `../CLAUDE.md`. Clé, session par cookie, HTTPS, pare-feu : `../docs/securite.md`.

**Ce qu'il fait.** Lit `events.db` et le disque backup écrits par House Sync (lecture seule) ; relaie go2rtc pour le direct (`GO2RTC_URLS`, un par enregistreur, le premier par défaut, `http://go2rtc:1984` ; réseau `sync_net` ; la caméra choisit son go2rtc d'après son adresse de direct) ; pilote le PoE du switch, le pont Hue et la prise Kasa ; relaie l'enregistreur pour les clips faits à la main. Il n'écrit jamais la base ni le disque backup : ses seules écritures sont les ordres aux équipements et les fichiers de `STATE_DIR` (`/state`, volume `data/house`, à créer sur la machine avec l'utilisateur qui lance Docker : le conteneur écrit en `node`, uid 1000) : positions des ampoules, clips sauvegardés, zones de surveillance, plan de la maison, plus la garde de la prise, les réglages du chauffage automatique (`heating.json`) et son journal (`heating-log.jsonl`, que House Sync importe).

Les routes, une à une, et les équipements : `src/routes/CLAUDE.md`.

## Fichiers

```
src/
├── index.ts          démarrage : configuration, application, écoute du port et des signaux (seul fichier hors couverture des tests)
├── server.ts         le serveur : HTTPS (certificat de la maison) ou HTTP, et son arrêt
├── config.ts         environnement validé : PORT, WEB_DIR, DATA_DIR, STATE_DIR, API_KEY (8 caractères au moins), GO2RTC_URLS (ou GO2RTC_URL), TLS_CERT/TLS_KEY, CA_CERT, RECORDER_URL, GUEST_*, PLUG_* (dont PLUG_TEMPERATURE_SENSOR), HOUSE_LATITUDE/HOUSE_LONGITUDE, HUE_BRIDGE_IP/HUE_APP_KEY, SWITCH_*
├── app.ts            assemblage : base, dépôts, services, routes, statique, 404, erreurs
├── types.ts          lignes de la base et forme des réponses
├── db/database.ts    SQLite en lecture seule, ouverte au premier besoin (DatabaseNotReady → 503)
├── repositories/     le SQL : cameras, events, snapshots
├── services/         les règles : poe (caméra → port du switch, état en cache 3 s), cameras, events (clip → /clips/id, 200 au plus), snapshots (tolérance 5 min), hue, plug, heating (la règle du chauffage automatique, tour de 60 s), live (relais go2rtc : le flux <flux>_mjpeg)
├── routes/           un fichier par service ; index.ts liste SECURED_PATHS (derrière la clé) ; welcome public
├── middleware/       requireKey (X-House-Key en temps constant, ou la session ; 10 clés fausses par adresse en 15 min, puis 429) ; session (cookie signé ouvert par /auth) ; errorHandler (JSON)
├── lib/hueClient.ts, automations.ts  le pont Hue (API v1 et v2) et ses règles en phrases
├── lib/kasaClient.ts  la prise Kasa (protocole local)
├── lib/switchClient.ts  client de la page web du switch ES208GP (connexion, lecture des ports, PoE on/off d'un port, une session à la fois)
├── lib/positionsStore.ts, zonesStore.ts, planStore.ts, savedClipsStore.ts  les fichiers de STATE_DIR (positions des ampoules, zones de surveillance par caméra, plan de la maison, clips sauvegardés)
├── lib/heatingSettings.ts, heatingLog.ts, heatingCost.ts  les réglages de la règle du chauffage (`heating.json`), son journal (`heating-log.jsonl`, rotation à 5000 lignes) et le coût prévu d’une activation
├── lib/sun.ts  le lever et le coucher du soleil (la nuit du chauffage) : **copie assumée de `sync/src/sun.ts`** (l’API ne dépend pas de House Sync) ; si l’un change, changer l’autre
├── lib/attemptLimiter.ts  les essais de clé ratés par adresse (en mémoire)
└── lib/backupFiles.ts  envoi d'un fichier du disque backup, jamais hors du disque, avec Range (la vidéo se déplace)
```

## Pour ajouter un service

Une requête dans `repositories/`, une règle dans `services/`, un fichier dans `routes/` monté dans `routes/index.ts` (et son chemin dans `SECURED_PATHS` s'il exige la clé), puis sa ligne dans `ApiExplorer/constants.ts` de la WebApp. Son explication dans la vue « Code » du site : règle générale de `../../../CLAUDE.md`.

## Tests

`npm test` (runner natif de Node, `node:test`, un `nom.test.ts` à côté de chaque fichier ; `src/testing/helpers.ts` : dossiers temporaires, serveur sur le port 0, base SQLite de test) et `npm run test:coverage`, qui échoue sous 100 % de lignes, de fonctions et de branches sur `src/**` (hors tests, `src/testing/` et `src/index.ts`). Aucun réseau réel : les équipements (pont Hue, prise Kasa, switch, go2rtc, enregistreur) sont simulés.

Vérifications : `npm run typecheck && npm run lint && npm run test:coverage`. Déploiement : `../docs/deploiement.md`.
