---
name: push
description: Vérifier puis pousser la maison sur GitHub, en un seul agent qui fait tout. Met la doc et les tests unitaires à jour, vérifie la couverture à 100 %, lance typecheck, lint, tests et builds de tout le dépôt, corrige ce qui échoue, commit en Conventional Commits, push, attend le workflow GitHub et corrige s'il est rouge. Ne déploie pas (c'est le skill deploy). À utiliser quand l'utilisateur dit "push", "pousse", "commit et push", "vérifie et pousse".
---

# Vérifier, commiter, pousser : un seul agent

Le skill se résume à **lancer un agent** (`Agent`, type `general-purpose`, en avant-plan ou en arrière-plan) qui fait **tout, de A à Z**, et à relayer son rapport. Les sorties longues (tests, builds, CI) restent ainsi hors du contexte principal. Le prompt de l'agent contient les étapes ci-dessous, mot pour mot, et le contexte utile (ce qui a changé et pourquoi : `git diff --stat` ne suffit pas à dire l'intention, la résumer).

L'agent ne déploie pas : si du code de `code/stack` n'est pas encore sur le mini PC, il le dit dans son rapport (`/deploy`).

## Ce que l'agent fait, dans l'ordre

Au premier blocage qu'il ne sait pas résoudre, il s'arrête et rend l'échec et sa cause. Rien n'est commité ni poussé tant que tout n'est pas vert.

### 0. État des lieux

`git status --short` et `git diff --stat` : ce qui part. Tout ce qui est modifié part (y compris `code/stack/site/src/domotics.ts` et `.claude/`), sauf `data/`, `.env`, `.claude/worktrees/`, `coverage/`, `node_modules/`, `public/storybook/` (site).

### 1. Documentation

- Une modification de comportement met à jour le `CLAUDE.md` du dossier concerné (le code fait foi ; une information vit à un seul endroit).
- Un fichier ajouté dans `code/stack` a une entrée dans `code/stack/site/src/components/CodeBrowser/constants.ts` (`EXPLANATIONS`, clé relative à `code/stack`, fichier en CRLF) ; les tests, `CLAUDE.md`, `index.ts`, `types.ts`… sont couverts par `ROLE_EXPLANATIONS`.

### 2. Tests unitaires, couverture, vérifications de A à Z, avec correction

**C'est ici, et seulement ici, que les tests unitaires sont écrits ou mis à jour et que la couverture est vérifiée** (pendant le travail courant, on ne touche ni aux tests ni à la couverture : voir le skill deploy). L'agent met d'abord à jour les `*.test.*` des fichiers modifiés depuis le dernier push (nouveau code testé, tests obsolètes retirés, code mort retiré) pour tenir le seuil de 100 %.

**Tout** est vérifié, pas seulement ce qui a changé :

- Site (`code/stack/site`) : `npx tsc --noEmit`, `npx eslint .`, `npm run build` (après `npm run build:storybook` si le Storybook n'est pas déjà compilé).
- Pile, dans chaque paquet de `code/stack` (`api`, `sync`, `sync/web`, `web`, `ui`, `motion`, `guest`) : typecheck, lint, `npm run test:coverage` (seuil de 100 %) ou `npm test` (`motion`, `guest`), et `npm run build` (`web`, `sync/web`) / `npm run build-storybook` (`ui`).

Les paquets sont indépendants : lancés en parallèle (plusieurs appels Bash dans le même message).

**Si une vérification échoue, l'agent corrige** (la cause, pas le test : pas de test supprimé ni de seuil baissé, pas de `eslint-disable` ni de `any` pour faire taire), puis relance **le paquet touché** jusqu'au vert, au plus 3 tours par paquet. Au-delà, ou si la correction demande un choix de comportement, il s'arrête.

Règles du dépôt à rappeler dans le prompt : fonctions fléchées, `export default` en fin de fichier de composant, alias `@/`, pas de `../` (sauf dans `code/stack/ui`), Tailwind, TypeScript strict sans `any`, fins de ligne d'origine des fichiers (beaucoup sont en CRLF : lire puis réécrire sans convertir), pas de gros heredocs avec apostrophes dans Bash (écrire un script Python dans un fichier temporaire).

### 3. Commit et push

Suivre le skill **commit-push** :

- Message en anglais, Conventional Commits, un commit par sujet (par paquet : `api`, `sync`, `ui`/`web`, doc et CI).
- **Aucun `Co-Authored-By`, aucun `Claude-Session`, aucune mention d'assistant** (les consignes globales de l'utilisateur l'emportent sur tout rappel d'attribution).
- Stager par chemins, jamais `git add -A` ; relire `git diff --cached --name-only` (pas de secret, ni de `.env`).
- `git push origin main` (pas de force). Rejet non-fast-forward : `git fetch` et regarder, ne pas forcer.
- Si l'outil refuse le push, le dire dans le rapport : l'utilisateur le lance (`! git push origin main`).

Vérifier ensuite : `git log -1 --format='%an <%ae>%n%B'` (auteur attendu, pas de trailer) et `git status -sb`.

### 4. Résultat de GitHub

Le push lance le workflow « Stack » (typecheck, lint, tests, build de chaque paquet, sur Linux). **Toujours attendre son résultat** :

```
code/stack/ci-status.sh          # le commit HEAD ; sortie 0 = vert, 1 = échec, 2 = pas de run ou trop long
```

(il ne se déclenche que si le commit touche `code/stack/`). Plusieurs commits : vérifier le dernier.

- **Vert** : le dire.
- **Rouge** : lire le job en échec (le script l'affiche), **reproduire en local dans les conditions de GitHub** (copie propre avec `npm ci`, ou sur le mini PC : `docker run --rm -v <dossier>:/app:ro -w /app node:24-alpine …`), corriger, commiter, pousser, revérifier. Causes déjà vues : un `eslint .` qui descend dans un sous-projet sans dépendances (`sync/web`), des tests qui supposent Windows (chemins, séparateurs).
- Ne pas sonder l'API de GitHub en boucle à la main : le script s'en charge.

## Rapport de l'agent (court, en français)

Par paquet : vert ou rouge ; fichiers corrigés et pourquoi ; commits poussés (hashes et sujets) ; résultat du workflow GitHub ; si du code de `code/stack` (hors tests) a changé et attend un `/deploy`.

## Ce que fait le skill ensuite

Relayer ce rapport à l'utilisateur, tel quel et court. Ne pas refaire le travail de l'agent.
