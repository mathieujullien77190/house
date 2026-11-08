---
name: deploy
description: Déployer rapidement la maison (code/stack) sur le mini PC, rien d'autre. Envoie les services changés par ./deploy.sh --skip-checks et contrôle les conteneurs. Ne lance pas les tests, ne commit pas, ne pousse pas (c'est le skill push). À utiliser quand l'utilisateur dit "déploie", "deploy", "mets en prod".
---

# Déployer (rapide)

Seulement envoyer et reconstruire sur le mini PC. **Ni tests complets, ni doc, ni commit, ni push** : c'est le skill **push**. Au premier échec, on s'arrête et on le dit.

## 1. Quoi envoyer

`git status --short` : voir ce qui a changé sous `code/stack/`. Rien de changé depuis le dernier déploiement : ne pas déployer (`./deploy.sh --dry-run` le dit).

## 2. Déployer

Depuis `code/stack` (Git Bash) :

```
./deploy.sh --skip-checks              # les services changés depuis le dernier déploiement
./deploy.sh --skip-checks api sync     # ou ceux-là seulement
```

`--skip-checks` saute typecheck, lint, tests et build locaux (le build Docker sur le mini PC échoue de toute façon si le code ne compile pas). Le script envoie par SSH **sans `data/` ni `.env`**, reconstruit dans l'ordre sync → motion → go2rtc → api → guest et note le commit déployé. `--compose` seulement si `docker-compose.yml` a changé.

Règles :
- **Jamais de suppression ni d'écrasement dans `code/stack/data/`** sans copie préalable et accord de l'utilisateur.
- Le mini PC (`mathieu@192.168.1.139`, `~/house/code/phase0`) ne parle pas à GitHub : on ne déploie que par ce script.
- Pas de test dans un navigateur (l'utilisateur teste lui-même) ; ne pas lancer de serveur mock.

## 3. Contrôle

```
ssh mathieu@192.168.1.139 'cd ~/house/code/phase0 && docker compose ps && docker compose logs --since 2m sync api | grep -iE "error|fatal|erreur" | head'
```

Les services déployés sont `running`/`healthy`, pas d'erreur au démarrage.

## 4. Rapport (très court)

Services déployés et leur état. Rappeler que rien n'est commité : `/push` pour vérifier et pousser.
