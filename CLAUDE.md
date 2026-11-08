# House – système domotique de la maison

Site React + TypeScript (Vite, Tailwind) pour **suivre le système domotique de la maison** : caméras, lumières, volets, prises. Tout s'exécute dans le navigateur, le schéma se sauvegarde dans le `localStorage`. Cinq onglets : **Caméra**, **Lumière**, **Volet**, **Prise**, **Architecture** (détail : `src/CLAUDE.md`).

Le dossier `code/stack/` contient la **vraie pile** (Docker, en service sur le mini PC). Le site décrit l'**état actuel** du système.

```
Caméras : 2 Reolink RLC-810A, PoE, au portail
   │  un câble RJ45 par caméra (données + alimentation)
   ▼
1 switch PoE TP-Link ES208GP (ports 3 et 4 pour les caméras), relié à la box
   ▼
Mini PC ACEMAGIC K1 (Ubuntu Server, SSD de 1 To) : Docker Compose, tout en conteneurs
   ▼
Box (Freebox) : internet, WiFi, serveur VPN WireGuard
   ▲  tunnel WireGuard (un seul port UDP ouvert)
Téléphone, hors de la maison
```

## Où est la documentation

| Je travaille sur… | Je lis |
|---|---|
| Le modèle, le schéma, le plan, les prix, les règles métier du site | `src/CLAUDE.md` |
| Les six vues de l'onglet Architecture, le Storybook servi par le site | `src/components/Architecture/CLAUDE.md` |
| La vue « Code » et les explications de fichiers | `src/components/CodeBrowser/CLAUDE.md` |
| La pile Docker en général (conteneurs, règles, commandes) | `code/stack/CLAUDE.md`, `code/stack/README.md` |
| Accès distant, pare-feu, SSH, clé et cookie, HTTPS | `code/stack/docs/securite.md` |
| Un service de la pile | le `CLAUDE.md` de son dossier : `api/`, `web/`, `sync/`, `sync/web/`, `motion/`, `go2rtc/`, `certs/`, `power/`, `ui/`, `guest/` (dans `code/stack/`) |
| Les lumières Hue et leurs automatisations | `code/stack/docs/hue.md` |
| La session Claude permanente du mini PC | `code/stack/remote/README.md` |

## Règles générales

- **Le code fait foi** : si la doc le contredit, corrige la doc.
- Une information vit à **un seul endroit** ; les autres fichiers y renvoient.
- Toute modification de comportement met à jour le CLAUDE.md du dossier concerné.
- Un fichier ajouté dans `code/stack` a son explication dans la vue « Code » (`src/components/CodeBrowser/CLAUDE.md`).
- **Ne jamais supprimer ni écraser de données** de `code/stack/data/` sans copie préalable et accord de l'utilisateur.

## Commandes

```
npm run dev        # serveur Vite
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # tsc puis vite build
npm run build:storybook   # Storybook de @house/ui dans public/storybook/
```

Avant de rendre un travail : `npx tsc`, `npx eslint .` et `npm run build` passent. Pour la pile Docker : `code/stack/CLAUDE.md`.

## Conventions de code

Communes au site et à `code/stack/web`, `code/stack/sync/web`, `code/stack/ui` (les composants dumb des deux apps, avec un Storybook ; les apps n'y gardent que les conteneurs).

- **Un dossier par composant** : `Nom.tsx` (conteneur : état, hooks, handlers), `UI.tsx` (rendu pur), `helpers.ts` (fonctions pures), `constants.ts` (valeurs et classes Tailwind), `types.ts`, `index.ts` (export par défaut + types).
- **Logique séparée du rendu** : `UI.tsx` n'a ni état métier ni calcul.
- **Fonctions fléchées partout**, jamais de `function`. `export default` en fin de fichier de composant.
- **Alias `@/` = `src/`** hors du dossier courant ; `./` dans le dossier ; jamais de `../`. On importe le dossier d'un composant.
- **Composants de bas niveau** dans `components/UI/`, métier dans `components/`.
- **Tailwind uniquement**, thème dans `src/index.css` (clair/sombre selon le système). Une seule classe par propriété sur un élément (ordre non garanti).
- TypeScript strict, pas de `any`.

## Pièges

- `typescript` bloqué en **~6.0** (`typescript-eslint` n'accepte pas la 7).
- Dans le shell Bash de Claude Code, éviter les gros heredocs avec des apostrophes.
- Pièges propres au site (clé `localStorage`, géométrie des liens) : `src/CLAUDE.md`.
