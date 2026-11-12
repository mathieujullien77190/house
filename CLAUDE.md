# House – système domotique de la maison

Site React + TypeScript (Vite, Tailwind) qui **suit le système domotique** : caméras, lumières, volets, prises. Tout tourne dans le navigateur, le schéma est sauvegardé dans le `localStorage`. Cinq onglets : Caméra, Lumière, Volet, Prise, Architecture.

`code/stack/` contient la **vraie pile** (Docker, en service sur le mini PC). Le site décrit l'**état actuel**. **Il tourne lui-même sur le mini PC** : `https://mini.local:8082` (service `site` de la pile, compilé et envoyé par `./deploy.sh site`, voir `code/stack/site/CLAUDE.md`).

```
4 caméras Reolink RLC-810A (PoE, un RJ45 chacune)
   ▼
Switch PoE TP-Link ES208GP (ports 3, 4, 7, 8), relié à la box
   ▼
Mini PC ACEMAGIC K1 (Ubuntu Server) : Docker Compose
   ▼
Box Freebox : internet, WiFi, VPN WireGuard (un seul port UDP)
   ▲
Téléphone, hors de la maison
```

## Où est la doc

| Sujet | Fichier |
|---|---|
| Modèle, schéma, plan, prix, règles métier du site | `src/CLAUDE.md` |
| Vues Architecture, Storybook servi par le site | `src/components/Architecture/CLAUDE.md` |
| Vue « Code » | `src/components/CodeBrowser/CLAUDE.md` |
| Pile Docker (conteneurs, règles, commandes) | `code/stack/CLAUDE.md`, `code/stack/README.md` |
| Accès distant, pare-feu, SSH, HTTPS | `code/stack/docs/securite.md` |
| Un service | `CLAUDE.md` de son dossier (`site/`, `api/`, `web/`, `sync/`, `sync/web/`, `motion/`, `go2rtc/`, `certs/`, `power/`, `ui/`, `guest/`) |
| Lumières Hue | `code/stack/docs/hue.md` |
| Session Claude du mini PC | `code/stack/remote/README.md` |

## Règles

- **Le code fait foi** : si la doc le contredit, corriger la doc.
- Une information vit à **un seul endroit**, les autres fichiers y renvoient.
- Tout changement de comportement met à jour le CLAUDE.md du dossier.
- Un fichier ajouté dans `code/stack` est expliqué dans la vue « Code » (`src/components/CodeBrowser/CLAUDE.md`).
- **Jamais supprimer ni écraser** de `code/stack/data/` sans copie préalable et accord de l'utilisateur.

## Commandes

```
npm run dev               # Vite
npm run typecheck         # tsc
npm run lint              # eslint
npm run build             # tsc puis vite build
npm run build:storybook   # Storybook de @house/ui dans public/storybook/
```

Avant de rendre un travail : `npx tsc`, `npx eslint .`, `npm run build`. Pile Docker : `code/stack/CLAUDE.md`.

## Conventions de code

Communes au site, à `code/stack/web`, `sync/web` et `ui` (composants dumb des deux apps, avec Storybook).

- **Un dossier par composant** : `Nom.tsx` (conteneur : état, hooks, handlers), `UI.tsx` (rendu pur), `helpers.ts`, `constants.ts` (valeurs, classes Tailwind), `types.ts`, `index.ts` (export par défaut + types).
- `UI.tsx` n'a ni état métier ni calcul.
- Fonctions fléchées partout, jamais `function`. `export default` en fin de fichier de composant.
- Alias `@/` = `src/` hors du dossier courant, `./` dedans, jamais `../`. On importe le dossier d'un composant.
- Bas niveau dans `components/UI/`, métier dans `components/`.
- Tailwind uniquement, thème dans `src/index.css` (clair/sombre selon le système). Une seule classe par propriété sur un élément.
- TypeScript strict, pas de `any`.

## Pièges

- `typescript` bloqué en **~6.0** (`typescript-eslint` n'accepte pas la 7).
- Shell Bash de Claude Code : éviter les gros heredocs avec apostrophes.
- Pièges du site (clé `localStorage`, géométrie des liens) : `src/CLAUDE.md`.
