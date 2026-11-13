# site – le site de la maison (schémas, Architecture, explications, vue Code, Storybook)

Contient le site React (sources dans `src/`, doc dans `src/CLAUDE.md`), **compilé** puis servi en HTTPS sur le port **8082** (`https://mini.local:8082`). Rien ne s'exécute côté serveur : nginx envoie des fichiers statiques.

- `Dockerfile` : `nginxinc/nginx-unprivileged` (utilisateur 101), copie `nginx.conf` et `www/`.
- `nginx.conf` : HTTPS avec `data/certs/cert.pem` et `key.pem` (montés en lecture seule, comme l'API), `assets/` en cache d'un an (noms hachés), le reste revérifié ; toute adresse inconnue renvoie `index.html`.
- `www/` : **fabriqué par `deploy.sh`, jamais commité** (ignoré par git, exclu de la vue Code). `deploy.sh` compile ici le Storybook de `@house/ui` (`npm run build:storybook`, dans `public/storybook`) puis le site (`npm run build`), et copie `dist/` dans `www/` avant l'envoi (seuls `Dockerfile`, `nginx.conf` et `www/` partent au mini PC).
- Le site garde son schéma dans le `localStorage` du navigateur : l'origine `https://mini.local:8082` a donc le sien.
- Pas de volume, pas de `data/` : le conteneur est en lecture seule (`tmpfs` sur `/tmp`), sans droit Linux, 64 Mo de mémoire. Santé : requête HTTPS locale sur `/`.
- Ouvert au réseau de la maison et au VPN comme 8080 et 8081 (`docs/securite.md`).
- Commandes (`npm ci` d'abord) : `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run build:storybook`, toutes dans ce dossier. Conventions : `../../../CLAUDE.md`.
