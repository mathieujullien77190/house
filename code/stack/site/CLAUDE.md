# site – le site de la maison (schémas, Architecture, explications, vue Code, Storybook)

Sert le site React de la racine du dépôt, **compilé**, en HTTPS sur le port **8082** (`https://mini.local:8082`). Rien ne s'exécute côté serveur : nginx envoie des fichiers statiques.

- `Dockerfile` : `nginxinc/nginx-unprivileged` (utilisateur 101), copie `nginx.conf` et `www/`.
- `nginx.conf` : HTTPS avec `data/certs/cert.pem` et `key.pem` (montés en lecture seule, comme l'API), `assets/` en cache d'un an (noms hachés), le reste revérifié ; toute adresse inconnue renvoie `index.html`.
- `www/` : **fabriqué par `deploy.sh`, jamais commité** (ignoré par git, exclu de la vue Code). `deploy.sh` compile le Storybook de `@house/ui` (`npm run build:storybook`, dans `public/storybook`) puis le site (`VITE_BASE=/ npm run build`) à la racine, et copie `dist/` ici avant l'envoi.
- Le site garde son schéma dans le `localStorage` du navigateur : l'origine `https://mini.local:8082` a donc le sien.
- Pas de volume, pas de `data/` : le conteneur est en lecture seule (`tmpfs` sur `/tmp`), sans droit Linux, 64 Mo de mémoire. Santé : requête HTTPS locale sur `/`.
- Ouvert au réseau de la maison et au VPN comme 8080 et 8081 (`docs/securite.md`).
- Vérification locale : `npm run typecheck`, `npm run lint` et `npm run build` à la racine du dépôt (`../../../CLAUDE.md`).
