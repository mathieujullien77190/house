# House – schéma et budget d'un système de caméras

## Présentation

Site React + TypeScript (Vite, Tailwind) pour **dessiner et chiffrer** un système de vidéosurveillance de maison. Tout s'exécute dans le navigateur, le schéma se sauvegarde dans le `localStorage`. La page montre :
- un **plan SVG interactif de la maison** sur deux étages (rez-de-chaussée avec le jardin, sous-sol), zoom +/−, composants déplaçables, traits qui suivent ;
- un **panneau de détail** du composant ou de la liaison sélectionnés ;
- un **dessin** de la caméra sélectionnée (Reolink, ou câblage de la mini-cam Pi Zero) ;
- ce qui se **branche au secteur** (badge ⚡) ;
- un **tableau des prix** relié au schéma.

Le dossier `code/phase0/` contient la **vraie pile de la phase 0** (Docker, en service sur le PC) : voir `code/phase0/CLAUDE.md` et le CLAUDE.md de chaque sous-dossier.

## Le système modélisé

```
Caméras : Reolink PoE ou mini-cam Pi Zero (Pi Zero 2 W + Camera Module 3), toutes en PoE
   │  un câble RJ45 par caméra (données + alimentation)
   ▼
2 switchs PoE (A et B) reliés entre eux ; les caméras sont réparties entre les deux
   │  chaque Pi5 a un lien vers A et un lien vers B
   ▼
Cluster k3s : les Pi5 (control-plane + worker) et le Pi de sauvegarde (control-plane sans applications)
   ▼
Pi de sauvegarde (SSD), sur le secteur comme les Pi5
```

**La maison** (`src/plan.ts`) : plain-pied avec jardin et sous-sol. Au nord : chambre 1, salle de bain, cuisine, escalier (en haut à droite). Au milieu : couloir à gauche, entrée à droite. Au sud : chambre 2 et le salon en L qui monte jusqu'à la cuisine. Portail à l'ouest, relié par un chemin à la porte au bout du couloir.

**Trois phases** (`Phase = 0 | 1 | 2`, `phases` sur chaque composant et lien, `inPhase` dans `src/nodes.ts`). `PhaseSwitch` filtre le schéma, les panneaux et les prix.
- **Phase 0, version light** : 1 Reolink 4K vers le portail, 1 switch PoE, le **PC** de la maison qui enregistre (`swA` → `pc` → `box` ← `phone`). `pc` et `box` sont des composants perso à 0 €, `phone` est relié à la box en `wifi`. Reolink comptée 74,50 € (lot de 2). Les panneaux secteur et k3s sont remplacés par `Phase0Architecture`.
- **Phase 1, strict minimum** : 3 Pi (2 Pi5 + le Pi de sauvegarde), 1 switch, 2 mini-cams Pi Zero.
- **Phase 2, installation complète** : phase 1 + 2ᵉ switch, 2 Reolink au portail, onduleur. Caméras et Pi répartis sur les deux switchs.

Le Pi de sauvegarde est sur le secteur avec sa propre alimentation 27 W (`pi-psu`), à toutes les phases.

**`Phase0Architecture`** : quatre vues, données dans `constants.ts`. « Matériel » et « Logiciel » (schémas SVG), « Code » (`CodeBrowser` : les fichiers de `code/phase0` avec une explication chacun), « Déploiement » (`DeploymentPanel` : les adresses réelles de la maison, comptes nommés, jamais de mot de passe). `DEFAULT_VIEW` reste `'hardware'`.

**Schéma de départ, phase 2** (`defaultNodes`, `src/nodes.ts`) : rez-de-chaussée, 2 Reolink au portail, 2 mini-cams dans le nichoir, 1 switch, 1 Pi5 et le Pi de sauvegarde dans le salon ; sous-sol, 1 switch et 1 Pi5. La mini-cam Pi Zero est en PoE : splitter PoE (5 V + RJ45) puis adaptateur Ethernet USB-OTG.

## Règles métier

- **Zones.** Une caméra a une zone (`ZONES`, `components/InfoPanel/constants.ts`). Quand elle change, `autoWire` (`src/wiring.ts`) la branche sur l'autre switch si la zone est déjà couverte (redondance), sinon sur le moins chargé.
- **Cluster k3s.** Le Pi de sauvegarde est le 3ᵉ control-plane (taint `node-role.kubernetes.io/backup=true:NoSchedule`, seulement des jobs de sauvegarde). `isK3sKind` (`src/nodes.ts`), panneau `K3sPanel`. Quorum = Pi5 + Pi de sauvegarde (≥ 3).
- **Panneau de détail.** Nom, description, zone, position (`locate`, `src/plan.ts`), liens décrits (`src/linkInfo.ts`) et mis en évidence dans le schéma.
- **Glossaire.** Termes dans `src/glossary.ts` ; `components/UI/RichText` les rend cliquables et ouvre `GlossarySheet` (via `GlossaryContext`, `src/lib/glossaryContext.ts`). Jamais de `RichText` dans un `<button>`.
- **Étages.** `floor` (`rdc` ou `basement`) sur chaque composant ; un étage affiché à la fois, l'autre en filigrane.
- **Composants ajoutés** (boutons +/− des prix) : caméra selon les zones ; Pi5 relié à tous les switchs ; switch relié aux Pi5 et au premier autre switch ; Pi de sauvegarde au switch le moins chargé (`wireInfra`). Le type d'une liaison est déduit (`linkTypeFor`) ; une liaison se supprime seulement ; un composant se retire par le bouton −.
- **Secteur 230 V.** Switchs, Pi5, Pi de sauvegarde et onduleur (`isMainsKind`, `MAINS_WATTS`). Les caméras sont en PoE.
- **Reolink RLC-810A** : 4K 25 i/s H.265, flux principal 4 à 8 Mb/s, flux secondaire 64 à 512 kb/s, PoE 802.3af 12 W, 94,99 € à l'unité. 2 lecteurs du flux principal au plus ; RTSP à activer dans la caméra ; pas d'ONVIF.
- **Switch TP-Link Omada ES208GP** (69,99 €) : 8 ports PoE+, 64 W, administrable (PoE coupable port par port, reprise automatique). Un seul câble entre les deux switchs, pas de RSTP (détection de boucle seulement). Avertissement au-delà de 8 caméras par switch (`POE_PORTS_PER_SWITCH`) ; 64 W = 5 Reolink en pratique.
- **Prix.** Calculés depuis le schéma ; les 3 Pi dans un groupe « Raspberry Pi ». Prix « dépôt » depuis `github.com/mathieujullien77190/birds` (`docs/schema-electronique.md`), le reste estimé. Avertissements : ports manquants, un seul switch, moins de 3 nœuds k3s.

## Commandes

```
npm run dev        # serveur Vite
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # tsc puis vite build
```

Avant de rendre un travail : `npx tsc`, `npx eslint .` et `npm run build` passent. Pour la pile de la phase 0, voir `code/phase0/CLAUDE.md`.

## Organisation du code

```
src/
├── main.tsx        point d'entrée
├── index.css       Tailwind et couleurs du thème (clair/sombre selon le système)
├── nodes.ts        modèle : types, modèles de composants, schéma par défaut, taille du canevas
├── plan.ts         géométrie de la maison et localisation d'un composant
├── linkInfo.ts     libellés et descriptions des liaisons
├── geometry.ts     tracé des liens et cadre du cluster (fonctions pures)
├── wiring.ts       branchements automatiques : autoWire (caméras) et wireInfra (Pi5, switchs, backup)
├── useDiagram.ts   état du schéma : ajout, déplacement, zones, liens, localStorage
├── catalog.ts      catalogue de prix, compteurs, avertissements
├── glossary.ts     termes du glossaire
├── lib/            classes Tailwind partagées, GlossaryContext
└── components/
    ├── App/                  assemble la page
    ├── PhaseSwitch/          choix de la phase, budget de chacune
    ├── Diagram/              schéma SVG : étage, glisser, clavier, zoom, mode secteur
    ├── HousePlan/            fond du schéma : plan de la maison
    ├── DiagramNode/          un composant du schéma
    ├── InfoPanel/            détail du composant ou de la liaison
    ├── Legend/               légende
    ├── K3sPanel/             nœuds k3s, règles, commandes
    ├── Phase0Architecture/   vues matériel, logiciel, code, déploiement
    ├── DeploymentPanel/      adresses réelles de la phase 0
    ├── CodeBrowser/          fichiers de code/phase0 : arbre, explication, code coloré
    ├── MainsPanel/           secteur 230 V
    ├── Pricing/              tableau des prix
    ├── CameraDialog/         boîte de dialogue d'une caméra (2D, 3D à la demande)
    ├── CameraModel3D/        vue 3D three.js
    ├── ReolinkDrawing/       dessin de la Reolink
    ├── PiZeroSchematic/      câblage de la mini-cam Pi Zero
    ├── GlossarySheet/        définition d'un terme
    └── UI/                   Button, Card, Field, Select, Badge, Stepper, SegmentedControl, RichText, BottomSheet, Dialog
```

## Conventions de code

- **Un dossier par composant** : `Nom.tsx` (conteneur : état, hooks, handlers), `UI.tsx` (rendu pur), `helpers.ts` (fonctions pures), `constants.ts` (valeurs et classes Tailwind), `types.ts`, `index.ts` (export par défaut + types). Les mêmes conventions dans `code/phase0/web`, `code/phase0/sync/web` et le paquet `code/phase0/ui` (les composants dumb des deux apps, avec un Storybook ; les apps n'y gardent que les conteneurs).
- **Logique séparée du rendu** : `UI.tsx` n'a ni état métier ni calcul.
- **Fonctions fléchées partout**, jamais de `function`. `export default` en fin de fichier de composant.
- **Alias `@/` = `src/`** hors du dossier courant ; `./` dans le dossier ; jamais de `../`. On importe le dossier d'un composant.
- **Composants de bas niveau** dans `components/UI/`, métier dans `components/`.
- **Couleurs** : le plan utilise les couleurs de la page ; seuls composants et liaisons ont des couleurs d'accent.
- **Caméras** : un clic (sans glisser, ou Entrée) ouvre `CameraDialog` (`<dialog>`, `UI/Dialog`) ; un glissement de plus de 4 unités déplace (`DRAG_THRESHOLD`).
- **Three.js** : chargé avec `React.lazy` ; millimètres ; scène construite une fois, démontage qui libère tout (`forceContextLoss`) ; molette seule = défilement, Ctrl + molette = zoom ; rendu arrêté hors écran.
- **Tailwind uniquement**, thème dans `index.css`. Une seule classe par propriété sur un élément (ordre non garanti).
- TypeScript strict, pas de `any`.
- **Vue « Code »** : tout fichier ajouté dans `code/phase0` y apparaît ; son explication va dans `components/CodeBrowser/constants.ts` (`EXPLANATIONS` ; `UI.tsx`, `types.ts`, `constants.ts`, `helpers.ts`, `index.ts`, `CLAUDE.md` ont une explication générique dans `ROLE_EXPLANATIONS`).

## Pièges connus

- `typescript` bloqué en **~6.0** (`typescript-eslint` n'accepte pas la 7).
- Clé `localStorage` `house-diagram-vN` (`src/useDiagram.ts`) : **incrémenter N** quand le modèle ou le schéma par défaut change.
- Les liens dépendent de `x`, `y`, `w`, `h` des composants (`geometry.ts`). Canevas 900 × 540 (`CANVAS`) pour les deux étages ; plan dans `src/plan.ts`, styles dans `components/HousePlan/constants.ts` ; `toBox` pour dessiner les rectangles.
- Le glob de `CodeBrowser` ignore `node_modules`, `dist`, `storybook-static`, `package-lock.json` (sinon Vite recharge à chaque écriture).
- Dans le shell Bash de Claude Code, éviter les gros heredocs avec des apostrophes.
