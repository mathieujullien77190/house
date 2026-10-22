# Phase 0

La pile de la phase 0, sur le PC : Frigate, House Sync, et House API qui sert la WebApp.
C'est un squelette minimal : chaque bloc démarre et répond, le reste viendra ensuite.

```
phase0/
├── docker-compose.yml   les trois conteneurs
├── .env.example         les variables à copier dans .env
├── frigate/             configuration de Frigate
├── sync/                House Sync (script de polling)
├── api/                 House API (service welcome)
└── web/                 WebApp (un appel à l'API)
```

## Démarrage

1. Copier `.env.example` en `.env` et remplir les valeurs.
2. Mettre l'adresse IP de la Reolink dans `frigate/config/config.yml`.
3. `docker compose up -d --build`
4. Frigate : `https://localhost:8971`. Au premier démarrage, le mot de passe `admin` est dans les logs
   (`docker compose logs frigate`). Créer ensuite un compte viewer pour House Sync.
5. WebApp : `http://localhost:8080` doit afficher la réponse du service welcome.
6. House Sync : `docker compose logs sync` montre si Frigate répond.

## À savoir

- Seuls les ports 8971 (Frigate) et 8080 (API) sont publiés. Le port 5000 de Frigate reste interne.
- L'API n'a pas encore d'authentification : à ajouter avant d'exposer les clips ou le PoE.
- Les données sont dans `data/` (ignoré par git) : `data/frigate` pour Frigate, `data/backup` pour la base et les clips.
