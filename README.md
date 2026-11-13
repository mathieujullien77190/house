# House – système domotique de la maison

Un site pour **suivre le système domotique d'une maison** : cinq onglets (Caméra, Lumière, Volet, Prise, Architecture). Chaque domaine dit ce qui est en place et ce qui est en préparation, avec le budget connu. L'onglet Caméra garde le plan interactif sur deux étages, le détail de chaque composant et de chaque liaison, la Reolink en 2D et en 3D, ce qui se branche au secteur, et un tableau des prix relié au schéma. Tout s'exécute dans le navigateur.

**En ligne** : https://mathieujullien77190.github.io/house/ ; sur le mini PC : `https://mini.local:8082` (service `site` de la pile, `code/stack/site/CLAUDE.md`).

## Ce que contient le dépôt

| Dossier | Contenu |
|---|---|
| `code/stack/site/` | le site (React, TypeScript, Vite, Tailwind), sources dans `src/`, compilé et servi par le mini PC |
| `code/stack/` | la **vraie pile**, en service sur le mini PC : Docker Compose, enregistreur, House Sync, House API, WebApp, `@house/ui` |
| `code/stack/remote/` | la session Claude Code permanente du mini PC (sans droit de suppression) |

## Commandes

```
cd code/stack/site
npm ci
npm run dev          # serveur Vite
npm run typecheck    # tsc
npm run lint         # eslint
npm run build        # tsc puis vite build
npm run build:storybook   # le Storybook de @house/ui, servi par le site à /storybook/
```

Avant de rendre un travail (dans `code/stack/site`) : `npx tsc`, `npx eslint .` et `npm run build` passent. La pile Docker a ses propres commandes (`code/stack/README.md`).

## Documentation

- `CLAUDE.md` : le site (modèle, règles métier, conventions de code) et la carte de toute la documentation.
- `code/stack/README.md` : démarrer la pile. `code/stack/CLAUDE.md` : son architecture, l'accès distant, le pare-feu, les données.
- Un `CLAUDE.md` par service dans `code/stack/` (`api`, `web`, `sync`, `sync/web`, `motion`, `go2rtc`, `certs`, `power`, `ui`).
- `code/stack/docs/hue.md` : les lumières Hue et leurs automatisations. `code/stack/remote/README.md` : la session Claude du mini PC.
