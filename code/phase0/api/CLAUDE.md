# api – House API

Express 5 en TypeScript exécuté par Node 24 (pas de compilation ; `npm run typecheck` vérifie). Lecture seule : lit `events.db` et le disque backup écrits par House Sync, n'appelle jamais Frigate. Sert aussi la WebApp compilée (`web/dist`, copiée dans l'image).

```
src/
├── index.ts          démarrage : configuration, application, serveur HTTPS (certificat de la maison) ou HTTP
├── config.ts         environnement validé : PORT, WEB_DIR, DATA_DIR, API_KEY (8 caractères au moins), TLS_CERT/TLS_KEY
├── app.ts            assemblage : base, dépôts, services, routes, statique, 404, erreurs
├── types.ts          lignes de la base et forme des réponses
├── db/database.ts    SQLite en lecture seule, ouverte au premier besoin (DatabaseNotReady → 503)
├── repositories/     le SQL : cameras, events, snapshots
├── services/         les règles : cameras, events (clip → /clips/id, 200 au plus), snapshots (tolérance 2 min)
├── routes/           un fichier par service ; index.ts liste SECURED_PATHS (derrière la clé) ; welcome public
├── middleware/       requireKey (X-House-Key, temps constant) ; errorHandler (JSON)
└── lib/backupFiles.ts  envoi d'un fichier du disque backup, jamais hors du disque, avec Range (la vidéo se déplace)
```

Services : `GET /welcome` (public) ; derrière la clé : `/auth`, `/direct`, `/image`, `/events` (`?last=1`), `/clips/:id`, `/snapshots?camera=&from=&to=`, `/snapshot?camera=&at=`.

Pour ajouter un service : une requête dans `repositories/`, une règle dans `services/`, un fichier dans `routes/` monté dans `routes/index.ts` (et son chemin dans `SECURED_PATHS` s'il exige la clé), puis son explication dans `src/components/CodeBrowser/constants.ts` du site et sa ligne dans `ApiExplorer/constants.ts` de la WebApp.

Après un changement : `docker compose up -d --build api`.
