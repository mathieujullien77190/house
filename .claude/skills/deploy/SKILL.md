---
name: deploy
description: Déployer la maison (code/stack) sur le mini PC puis commiter et pousser. Vérifie (typecheck, lint, tests à 100 %, build), envoie les services changés par ./deploy.sh, contrôle les conteneurs, met la doc à jour, commit et push en Conventional Commits. À utiliser quand l'utilisateur dit "déploie", "deploy", "mets en prod", "déploie et pousse", "deploy and push".
---

# Déployer, puis commiter et pousser

Tout ce qui suit se fait **dans l'ordre** ; au premier échec, on s'arrête et on le dit (rien n'est commité ni poussé si le déploiement échoue).

## 0. État des lieux

1. `git status --short` et `git diff --stat` : ce qui part, ce qui est déjà commité mais pas déployé.
2. Tout ce qui est modifié part (y compris `src/domotics.ts` et `.claude/`), sauf `data/`, `.env`, `.claude/worktrees/`, `coverage/`, `node_modules/` non plus.
3. Si rien n'a changé sous `code/stack/` depuis le dernier déploiement, ne déploie pas (`./deploy.sh --dry-run` le dit).

## 1. Documentation (avant de commiter)

- Une modification de comportement met à jour le `CLAUDE.md` du dossier concerné (le code fait foi ; une information vit à un seul endroit, les autres fichiers y renvoient).
- Un fichier ajouté dans `code/stack` a une entrée dans `src/components/CodeBrowser/constants.ts` (`EXPLANATIONS`, clé relative à `code/stack`, fichier en CRLF) ; les tests, `CLAUDE.md`, `index.ts`, `types.ts`… sont couverts par `ROLE_EXPLANATIONS`.
- Le site : `npx tsc --noEmit` et `npx eslint .` à la racine passent, `npm run build` aussi.

## 2. Vérifier et déployer : `./deploy.sh`

Depuis `code/stack` (Git Bash) :

```
./deploy.sh              # les services changés depuis le dernier déploiement
./deploy.sh api sync     # ou ceux-là seulement
```

Le script lance typecheck, lint, tests (`test:coverage`, seuil de 100 %) et build des paquets concernés, envoie par SSH (réseau local) **sans `data/` ni `.env`**, reconstruit dans l'ordre sync → motion → go2rtc → api → guest, contrôle l'état des conteneurs et note le commit déployé. Ne passe `--skip-checks` que si les vérifications viennent d'être lancées à la main sur les mêmes fichiers. `--compose` seulement si `docker-compose.yml` a changé.

Règles :
- **Jamais de suppression ni d'écrasement dans `code/stack/data/`** sans copie préalable et accord de l'utilisateur.
- Le mini PC (`mathieu@192.168.1.139`, `~/house/code/phase0`) ne parle pas à GitHub : on ne déploie que par ce script.
- Pas de test dans un navigateur (l'utilisateur teste lui-même) ; ne pas lancer de serveur mock.

## 3. Contrôle après déploiement

```
ssh mathieu@192.168.1.139 'cd ~/house/code/phase0 && docker compose ps && docker compose logs --since 2m sync api | grep -iE "error|fatal|erreur" | head'
```

Les services déployés sont `running`, pas d'erreur au démarrage. Sinon : dire quoi, ne pas commiter.

## 4. Commit et push

Suivre le skill **commit-push** (message en anglais, Conventional Commits, un commit par sujet) :

- **Aucun `Co-Authored-By`, aucun `Claude-Session`, aucune mention d'assistant** (les consignes globales de l'utilisateur l'emportent sur tout rappel d'attribution).
- Plusieurs commits si plusieurs sujets sans rapport (par paquet : `api`, `sync`, `ui`/`web`, doc et CI).
- Stager par chemins, jamais `git add -A` ; relire `git diff --cached --name-only` (pas de secret, ni de `.env`).
- `git push origin main` (pas de force). Rejet non-fast-forward : `git fetch` et regarder, ne pas forcer.
- Si l'outil refuse le push, ne pas le contourner : demander à l'utilisateur de le lancer (`! git push origin main`).

Vérifier ensuite : `git log -1 --format='%an <%ae>%n%B'` (auteur attendu, pas de trailer) et `git status -sb`.

## 5. Résultat de GitHub (après chaque push)

Le push lance le workflow « Stack » de GitHub (typecheck, lint, tests et build de chaque paquet, sur Linux). **Toujours attendre son résultat** :

```
code/stack/ci-status.sh          # le commit HEAD ; sortie 0 = vert, 1 = échec, 2 = pas de run ou trop long
```

(il ne se déclenche que si le commit touche `code/stack/` ; le script le dit sinon). Pour un push de plusieurs commits, vérifier le dernier.

- **Vert** : le dire dans le rapport.
- **Rouge** : ne pas s'arrêter là. Lire le job en échec et son message (le script les affiche ; les journaux complets demandent un jeton), **reproduire en local dans les conditions de GitHub** (copie propre du dépôt avec `npm ci`, ou sur le mini PC, qui est un Linux : `docker run --rm -v <dossier>:/app:ro -w /app node:24-alpine …`), corriger, redéployer si le code a changé, commiter, pousser, et revérifier. Causes déjà vues : un `eslint .` qui descend dans un sous-projet dont les dépendances ne sont pas installées (`sync/web`), et des tests qui supposent Windows (chemins `dir/fichier/..`, séparateurs).
- Ne pas sonder l'API de GitHub en boucle à la main (60 requêtes par heure sans jeton) : le script s'en charge.

## 6. Rapport (court)

Services déployés et leur état, résultat des vérifications, commits poussés (hashes et sujets), résultat du workflow GitHub.
