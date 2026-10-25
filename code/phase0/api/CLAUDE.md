# api – House API

Express 5 en TypeScript exécuté par Node 24 (pas de compilation ; `npm run typecheck` vérifie). Lit `events.db` et le disque backup écrits par House Sync (lecture seule), relaie go2rtc (`GO2RTC_URLS`, un par enregistreur, le premier par défaut, `http://go2rtc:1984` ; réseau `sync_net`) pour le direct, celui de la caméra étant choisi d'après son adresse de direct, et pilote le PoE du switch (`/poe`). Son seul pouvoir d'écriture est celui-là. Sert aussi la WebApp compilée (`web/dist`, copiée dans l'image).

```
src/
├── index.ts          démarrage : configuration, application, serveur HTTPS (certificat de la maison) ou HTTP
├── config.ts         environnement validé : PORT, WEB_DIR, DATA_DIR, API_KEY (8 caractères au moins), GO2RTC_URL, TLS_CERT/TLS_KEY
├── app.ts            assemblage : base, dépôts, services, routes, statique, 404, erreurs
├── types.ts          lignes de la base et forme des réponses
├── db/database.ts    SQLite en lecture seule, ouverte au premier besoin (DatabaseNotReady → 503)
├── repositories/     le SQL : cameras, events, snapshots
├── services/         les règles : poe (caméra → port du switch, état en cache 3 s), cameras, events (clip → /clips/id, 200 au plus), snapshots (tolérance 2 min), live (relais go2rtc : le flux <flux>_mjpeg)
├── routes/           un fichier par service ; index.ts liste SECURED_PATHS (derrière la clé) ; welcome public
├── middleware/       requireKey (X-House-Key en temps constant, ou la session) ; session (cookie ouvert par /auth) ; errorHandler (JSON)
├── lib/backupFiles.ts  envoi d'un fichier du disque backup, jamais hors du disque, avec Range (la vidéo se déplace)
└── lib/switchClient.ts client de la page web du switch ES208GP (connexion, lecture des ports, PoE on/off d'un port, une session à la fois)
```

Services : `GET /welcome` (public) ; derrière la clé ou la session : `/auth` (vérifie la clé et ouvre la session par cookie), `/direct`, `/image`, `/events` (`?last=1` ; `?camera=&from=&to=` en secondes : les événements qui touchent cette fenêtre, 1000 au plus, `&limit=` pour moins ; sans paramètre, les 200 derniers), `/clips/:id`, `/snapshots?camera=&from=&to=`, `/snapshot?camera=&at=`, `/stream?camera=` (le direct MJPEG, relayé de go2rtc tant que le client reste connecté) et `/frame?camera=` (l'image à l'instant), `GET /poe` (l'alimentation de chaque caméra : PoE activé, alimentée, watts, et `streaming` : les octets reçus par go2rtc augmentent, donc elle a fini de démarrer) et `POST /poe/:camera` avec `{"on": true|false}` (rend ou coupe le PoE du port ; 503 sans switch configuré). `/logout` ferme la session.

**Switch.** Variables : `SWITCH_URL` (`http://192.168.1.33`), `SWITCH_USER`, `SWITCH_PASSWORD` (dans `.env`, absent = poe désactivé), `SWITCH_PORTS` (`portail:7,camera2:6`, caméra:port). Aucune API officielle sans contrôleur : le client imite la page web du firmware 1.0.1 (`logon.cgi`, `poe_port_config.cgi?poe_status=…&selBit=…`, `logout.cgi`). Un autre firmware peut casser ces commandes. Couper le PoE éteint la caméra : l'enregistreur réessaie son flux jusqu'au retour du courant.

Pour ajouter un service : une requête dans `repositories/`, une règle dans `services/`, un fichier dans `routes/` monté dans `routes/index.ts` (et son chemin dans `SECURED_PATHS` s'il exige la clé), puis son explication dans `src/components/CodeBrowser/constants.ts` du site et sa ligne dans `ApiExplorer/constants.ts` de la WebApp.

Après un changement : `docker compose up -d --build api`.
