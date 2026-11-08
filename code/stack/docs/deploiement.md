# Déploiement

Deux voies, qui font la même chose (`deploy.sh`) : à la main depuis le PC, ou automatiquement à chaque `push` sur `main` (GitHub Actions, runner sur le mini PC).

## À la main : `deploy.sh`

Depuis `code/stack` (Git Bash) :

```
./deploy.sh                 # les services changés depuis le dernier déploiement
./deploy.sh api sync        # ceux-là seulement
./deploy.sh --all           # tout
./deploy.sh --dry-run       # montre le plan, n'envoie rien
./deploy.sh --skip-checks   # sans typecheck / lint / tests
./deploy.sh --compose       # envoie aussi docker-compose.yml
```

Ce qu'il fait, dans l'ordre :

1. Choisit les services : `web` et `ui` passent par `api` (la WebApp est compilée dans son image), `ui` aussi par `sync`. Sans argument, il compare le commit déployé (`.deployed-commit` sur le mini PC) au dépôt local, fichiers non suivis compris.
2. Lance typecheck, lint, tests (et build pour les apps) de chaque paquet concerné ; un script absent est ignoré.
3. Envoie par `tar` les dossiers des services, **sans** `data/`, `.env`, `node_modules`, `dist`, `coverage`, `storybook-static`. `sync/web` part avec `sync`.
4. Reconstruit dans l'ordre sync, motion, go2rtc, api, guest (`docker compose up -d --build --no-deps <service>` : `--no-deps` évite de redémarrer `motion` pour rien ; `go2rtc` est seulement relancé).
5. Contrôle l'état de chaque conteneur et les erreurs des 30 dernières secondes ; sort en erreur sinon.
6. Écrit le commit déployé dans `.deployed-commit`.

Variables : `DEPLOY_HOST` (`mathieu@192.168.1.139` par défaut ; `local` quand le script tourne déjà sur le mini PC), `DEPLOY_DIR` (`house/code/phase0`).

**Retour arrière** : `git checkout <commit>` puis `./deploy.sh --all --skip-checks`. Les données (`data/`) ne sont jamais touchées ; une migration de base (colonne ajoutée par `sync`) n'est pas annulée.

## Automatique : GitHub Actions (`.github/workflows/stack.yml`)

- Job **check** (GitHub, à chaque push et pull request sous `code/stack/`) : typecheck, lint, tests, build, par paquet.
- Job **deploy** (sur `main`, après `check`) : tourne sur un **runner auto-hébergé** du mini PC (étiquettes `self-hosted`, `house`) et lance `deploy.sh --skip-checks` avec `DEPLOY_HOST=local`. Inerte tant que la variable de dépôt `DEPLOY_ENABLED` n'est pas `true`.

### Mise en place du runner (une fois, à faire par l'utilisateur)

Rien n'est ouvert sur internet : le runner sort vers GitHub, il ne reçoit rien. Mais il exécute le code du dépôt avec accès à Docker : dépôt **privé** seulement, jamais de déploiement déclenché par une pull request d'un tiers (le job deploy n'écoute que `main`).

1. GitHub → dépôt → Settings → Actions → Runners → New self-hosted runner (Linux x64) ; suivre les commandes affichées sur le mini PC, avec l'utilisateur `mathieu` (il possède déjà `~/house/code/phase0` et le groupe `docker`). Ajouter l'étiquette `house`.
2. Installer le service : `sudo ./svc.sh install mathieu && sudo ./svc.sh start`.
3. Node 24 sur le mini PC n'est pas nécessaire (les vérifications tournent sur GitHub ; le déploiement n'utilise que `tar`, `git` et `docker`).
4. Settings → Secrets and variables → Actions → Variables : `DEPLOY_ENABLED` = `true`.

Le runner n'a pas besoin de `.env` ni de `data/` : ils restent dans `~/house/code/phase0`.
