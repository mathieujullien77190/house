# Déploiement

Le déploiement se fait **à la main, depuis le PC, par SSH sur le réseau local** (`deploy.sh`). Le mini PC ne parle jamais à GitHub : pas de runner, pas de déploiement déclenché par un push.

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

Variables : `DEPLOY_HOST` (`mathieu@192.168.1.139` par défaut), `DEPLOY_DIR` (`house/code/phase0`).

**Retour arrière** : `git checkout <commit>` puis `./deploy.sh --all --skip-checks`. Les données (`data/`) ne sont jamais touchées ; une migration de base (colonne ajoutée par `sync`) n'est pas annulée.

## GitHub : seulement les vérifications

`.github/workflows/stack.yml` lance typecheck, lint, tests et build de chaque paquet sur les serveurs de GitHub à chaque push et pull request sous `code/stack/`. Il ne touche pas au mini PC.
