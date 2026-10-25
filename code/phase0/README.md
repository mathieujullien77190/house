# Phase 0

La pile de la phase 0, sur le PC : Frigate, House Sync, et House API qui sert la WebApp.

```
phase0/
├── docker-compose.yml   les trois conteneurs, plus le conteneur éphémère des certificats
├── .env.example         les variables à copier dans .env
├── certs/               la CA de la maison et le certificat du PC (make-certs.sh)
├── frigate/             configuration de Frigate
├── sync/                House Sync (polling de Frigate, copie des clips, écriture de SQLite)
├── api/                 House API (lecture seule : auth, direct, image, events, clips)
└── web/                 WebApp : projet Vite + React + TypeScript (la clé, puis trois onglets)
```

## WebApp

Trois onglets après la clé : **Caméras** (nom, dernière image, frise des événements sur 1 h à 7 jours, clip
de l'événement cliqué),
**API** (chaque service, un clic montre sa réponse JSON) et **Frigate** (son interface dans la page).

## Page de House Sync

Pour contrôler ce que fait House Sync : `https://<adresse du PC>:8081`, la même clé que la WebApp. House Sync
sert cette page lui-même (HTML côté serveur, rechargée toutes les 15 s) : sa base SQLite table par table et
les fichiers du disque backup. L'API n'expose jamais la base brute.
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
   15 secondes, le nombre de caméras et de nouveaux événements. Un événement n'arrive qu'une fois terminé
   (la personne est sortie du champ) et son clip prêt : compter jusqu'à 30 secondes avant de le voir.
6. Installer la CA de la maison sur chaque appareil, une fois : le fichier `data/certs/rootCA.pem`.
   Windows : double-clic, « Installer un certificat », utilisateur actuel, magasin « Autorités de
   certification racines de confiance ». Android : Paramètres > Sécurité > Chiffrement et identifiants >
   Installer un certificat > Certificat CA. Puis fermer et rouvrir le navigateur.
7. WebApp : `https://<adresse du PC>:8080` (le même hôte que `FRIGATE_PUBLIC_URL`, en HTTPS), entrer la clé
   de l'API. Le direct et la dernière image viennent de Frigate : il faut s'être connecté à Frigate dans le
   navigateur (lien « Ouvrir Frigate »).

## À savoir

- Ports publiés : 8971 (Frigate), 8080 (API et WebApp), 8081 (page de House Sync). Le port 5000 de Frigate
  reste interne.
- Deux connexions, par choix : celle de Frigate (cookie, pour le direct et l'image que le navigateur charge
  sans passer par l'API) et la clé de l'API (en-tête `X-House-Key`, pour les événements et les clips).
- L'API ne lit que SQLite et le disque backup. Les identifiants de Frigate ne sont que dans House Sync.
- Pourquoi HTTPS et le même hôte : le cookie de Frigate est `SameSite=Lax`, le navigateur ne l'envoie à
  l'iframe et à l'image que si la WebApp est sur le même site (même scheme, même hôte ; le port ne compte
  pas). Avec `http://localhost:8080`, le direct et l'image restent noirs.
- Les certificats : `data/certs` contient la CA (`rootCA.pem`, sa clé `rootCA-key.pem` qui ne sort jamais du
  PC) et le certificat du PC, signé par elle, que l'API et Frigate servent tous les deux. Sans la CA
  installée, le navigateur affiche un avertissement ; avec, le cadenas est vert. Le certificat est refait
  automatiquement si `CERT_HOSTS` change ou à moins de 30 jours de son expiration (`docker compose up -d`).
- Les données sont dans `data/` (ignoré par git) : `data/frigate` pour Frigate, `data/backup` pour la base
  `events.db` et les clips (`clips/<caméra>/<id>.mp4`). Si le schéma de la base change, supprimer `events.db`.
- Frigate écrit sa base et ses secrets à côté de `config.yml` : tout y est ignoré par git sauf la config.
