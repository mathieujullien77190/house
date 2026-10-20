# House – schéma et budget d'un système de caméras

**Live : <https://mathieujullien77190.github.io/house/>**

Petit site React + TypeScript (Vite, Tailwind, three.js) pour dessiner et chiffrer un système de
vidéosurveillance de maison : plan interactif sur deux étages, panneau de détail, dessin de la caméra
sélectionnée, composants à brancher au secteur et tableau des prix relié au schéma.

Tout s'exécute dans le navigateur, sans serveur ni API. Le schéma est sauvegardé dans le `localStorage`.

## Démarrer

```sh
npm install
npm run dev        # http://localhost:5173
```

```sh
npm run build      # build statique dans dist/ (base /house/)
npm run lint
npm run typecheck
```

Le site est déployé sur GitHub Pages à chaque push sur `main` (`.github/workflows/deploy-pages.yml`).
