# House – schéma et budget d'un système de caméras

## Présentation

Site React + TypeScript (Vite, Tailwind) pour **dessiner et chiffrer** un système de vidéosurveillance de maison. Tout s'exécute dans le navigateur, le schéma se sauvegarde dans le `localStorage`. La page montre :
- un **plan SVG interactif de la maison** sur deux étages (rez-de-chaussée avec le jardin, sous-sol), zoom +/−, composants déplaçables, traits qui suivent ;
- un **panneau de détail** du composant ou de la liaison sélectionnés ;
- un **dessin** de la caméra sélectionnée (Reolink, en 2D et en 3D) ;
- ce qui se **branche au secteur** (badge ⚡) ;
- un **tableau des prix** relié au schéma.

Le dossier `code/stack/` contient la **vraie pile** (Docker, en service sur le mini PC) : voir `code/stack/CLAUDE.md` et le CLAUDE.md de chaque sous-dossier. Le site décrit l'**état actuel** du système : il n'y a plus de phases ni de scénarios.

## Où est la documentation

| Je travaille sur… | Je lis |
|---|---|
| Le site (schéma, prix, plan, vues) | ce fichier |
| La pile Docker en général, l'accès distant, le pare-feu, les données | `code/stack/CLAUDE.md`, `code/stack/README.md` |
| Un service de la pile | le `CLAUDE.md` de son dossier : `api/`, `web/`, `sync/`, `sync/web/`, `motion/`, `go2rtc/`, `certs/`, `power/`, `ui/` (dans `code/stack/`) |
| Les lumières Hue et leurs automatisations | `code/stack/docs/hue.md` |
| La session Claude permanente du mini PC | `code/stack/remote/README.md` |

Règles : **le code fait foi** (si la doc le contredit, corrige la doc) ; une information vit à **un seul endroit** (les autres fichiers y renvoient) ; toute modification de comportement met à jour le CLAUDE.md du dossier concerné ; **ne jamais supprimer ni écraser de données** de `code/stack/data/` sans copie préalable et accord de l'utilisateur.

## Le système modélisé

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

**La maison** (`src/plan.ts`) : plain-pied avec jardin et sous-sol. Au nord : chambre 1, salle de bain, cuisine, escalier (en haut à droite). Au milieu : couloir à gauche, entrée à droite. Au sud : chambre 2 et le salon en L qui monte jusqu'à la cuisine. Portail à l'ouest, relié par un chemin à la porte au bout du couloir.

**Le schéma** (`defaultNodes` et `defaultLinks`, `src/nodes.ts`) : `cam1` et `cam2` (2 Reolink au portail) → `swA` (le switch) → `mini` (composant libre à 479 €, 65 W : ACEMAGIC K1, Ryzen 5 7530U, 16 Go, SSD M.2 1 To, un port Ethernet 1 Gb/s, Linux + Docker) et `box` (la box, 0 €) ; `pc` (le PC de la maison, composant libre à 0 €, relié à la box en `wifi`) ; `remote` (le téléphone en 4G, hors de la maison, dans le jardin en haut à droite) relié à la box par un lien `vpn` (WireGuard, bleu, longs tirets). Pas de Pi, pas de k3s (écartés : plus chers et moins puissants), pas de second switch.

**`Architecture`** (`src/components/Architecture`) : cinq vues. « Matériel » et « Logiciel » (schémas SVG, avec l'accès distant WireGuard : un cadre « Hors de la maison », le tunnel en bleu, le serveur VPN de la Freebox), « Interfaces » (`InterfacesMap` : l'architecture des deux apps web, de `@house/ui`, de Storybook et de House API, pastilles posées par `layoutColumns`), « Code » (`CodeBrowser` : les fichiers de `code/stack` avec une explication chacun), « Déploiement » (`DeploymentPanel` : les adresses réelles de la maison, l'accès distant, comptes nommés, jamais de mot de passe). Les données sont dans `constants.ts` (`ARCHITECTURE`) ; une flèche `vpn: true` est le tunnel. `DEFAULT_VIEW` reste `'hardware'`.

## Règles métier

- **Zones.** Une caméra a une zone (`ZONES`, `components/InfoPanel/constants.ts`). Quand elle change, `autoWire` (`src/wiring.ts`) la branche sur un switch qui ne couvre pas encore cette zone (redondance), sinon sur le moins chargé. Le schéma par défaut n'a qu'un switch : elle le choisit alors toujours.
- **Accès distant.** Jamais de redirection de ports : le VPN WireGuard de la Freebox amène un téléphone sur le réseau de la maison (adresse `192.168.27.0/24`, le mini PC y est vu à `192.168.27.139`, ports 8080 et 8081), le pare-feu du mini PC (ufw, et `DOCKER-USER` pour les ports que Docker publie) n'ouvre SSH, 8080 et 8081 qu'au réseau de la maison et à ce réseau. Le lien `vpn` du schéma (`LinkType`) le représente.
- **Panneau de détail.** Nom, description, zone, position (`locate`, `src/plan.ts`), liens décrits (`src/linkInfo.ts`) et mis en évidence dans le schéma.
- **Glossaire.** Termes dans `src/glossary.ts` ; `components/UI/RichText` les rend cliquables et ouvre `GlossarySheet` (via `GlossaryContext`, `src/lib/glossaryContext.ts`). Jamais de `RichText` dans un `<button>`.
- **Étages.** `floor` (`rdc` ou `basement`) sur chaque composant ; un étage affiché à la fois, l'autre en filigrane.
- **Composants ajoutés** (boutons +/− des prix) : aucun composant ne s'ajoute plus par le tableau (Reolink, switch et mini PC sont fixes, sans +/−) ; une caméra ajoutée autrement se brancherait selon sa zone (`autoWire`). Le type d'une liaison est déduit (`linkTypeFor`) ; une liaison se supprime seulement ; un composant se retire par le bouton −.
- **Secteur 230 V.** Le switch et les composants libres qui déclarent des watts, comme le mini PC (`isMainsNode`, `MAINS_WATTS`). Les caméras sont en PoE.
- **Reolink RLC-810A** : 4K 25 i/s H.265, flux principal 4 à 8 Mb/s, flux secondaire 64 à 512 kb/s, PoE 802.3af 12 W, 94,99 € à l'unité (le tableau compte 74,50 € : lot de 2 à 149 €). 2 lecteurs du flux principal au plus ; RTSP à activer dans la caméra ; pas d'ONVIF.
- **Switch TP-Link Omada ES208GP** (69,99 €) : 8 ports PoE+, 64 W, administrable (PoE coupable port par port, reprise automatique). Avertissement au-delà de 8 caméras par switch (`POE_PORTS_PER_SWITCH`) ; 64 W = 5 Reolink en pratique.
- **Prix.** Calculés depuis le schéma, pour tout ce que le système compte aujourd'hui (`src/catalog.ts`). Le mini PC (479 €, SSD de 1 To compris) est un composant à prix saisi (un disque externe `disk` reste ajoutable : 129 € plus 6,95 € d'adaptateur) ; le seul câble chiffré est le rouleau de 100 m d'Ethernet Cat6 d'extérieur pour les caméras (deleyCON, 84,26 €, Amazon) ; la ligne du tableau est un lien vers la fiche (`url` de `Line`). Reolink comptée 74,50 € (lot de 2). Rien n'est grisé : une ligne à zéro disparaît, sauf un compteur réglable. Prix « dépôt » depuis `github.com/mathieujullien77190/birds` (`docs/schema-electronique.md`), le reste estimé. Le disque dur externe et les composants libres se chiffrent à la main (`isPricedByHand`). Avertissements : ports manquants, trop de caméras PoE par switch.

## Commandes

Le **Storybook** de `@house/ui` est servi avec ce site : `npm run build:storybook` le compile dans `public/storybook/` (ignoré par git), Vite le sert à `/storybook/index.html`, et l'onglet « Interfaces » y renvoie. À refaire quand les composants ou les stories changent.

```
npm run dev        # serveur Vite
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # tsc puis vite build
```

Avant de rendre un travail : `npx tsc`, `npx eslint .` et `npm run build` passent. Pour la pile Docker, voir `code/stack/CLAUDE.md`.

## Organisation du code

```
src/
├── main.tsx        point d'entrée
├── index.css       Tailwind et couleurs du thème (clair/sombre selon le système)
├── nodes.ts        modèle : types, modèles de composants, schéma par défaut, taille du canevas
├── plan.ts         géométrie de la maison et localisation d'un composant
├── linkInfo.ts     libellés et descriptions des liaisons
├── geometry.ts     tracé des liens et cadre du cluster (fonctions pures)
├── wiring.ts       branchement automatique d'une caméra : autoWire
├── useDiagram.ts   état du schéma : ajout, déplacement, zones, liens, localStorage
├── catalog.ts      catalogue de prix, compteurs, avertissements
├── glossary.ts     termes du glossaire
├── lib/            classes Tailwind partagées, GlossaryContext
└── components/
    ├── App/                  assemble la page
    ├── Diagram/              schéma SVG : étage, glisser, clavier, zoom, mode secteur
    ├── HousePlan/            fond du schéma : plan de la maison
    ├── DiagramNode/          un composant du schéma
    ├── InfoPanel/            détail du composant ou de la liaison
    ├── Legend/               légende
    ├── Architecture/         vues matériel, logiciel, interfaces, code, déploiement
    ├── DeploymentPanel/      adresses réelles du système, accès distant
    ├── InterfacesMap/       schéma des interfaces : apps web, @house/ui, Storybook, House API
    ├── CodeBrowser/          fichiers de code/stack : arbre, explication, code coloré
    ├── MainsPanel/           secteur 230 V
    ├── Pricing/              tableau des prix
    ├── CameraDialog/         boîte de dialogue d'une caméra (2D, 3D à la demande)
    ├── CameraModel3D/        vue 3D three.js de la Reolink
    ├── ReolinkDrawing/       dessin de la Reolink
    ├── GlossarySheet/        définition d'un terme
    └── UI/                   Button, Card, Field, Select, Badge, Stepper, SegmentedControl, RichText, BottomSheet, Dialog
```

## Conventions de code

- **Un dossier par composant** : `Nom.tsx` (conteneur : état, hooks, handlers), `UI.tsx` (rendu pur), `helpers.ts` (fonctions pures), `constants.ts` (valeurs et classes Tailwind), `types.ts`, `index.ts` (export par défaut + types). Les mêmes conventions dans `code/stack/web`, `code/stack/sync/web` et le paquet `code/stack/ui` (les composants dumb des deux apps, avec un Storybook ; les apps n'y gardent que les conteneurs).
- **Logique séparée du rendu** : `UI.tsx` n'a ni état métier ni calcul.
- **Fonctions fléchées partout**, jamais de `function`. `export default` en fin de fichier de composant.
- **Alias `@/` = `src/`** hors du dossier courant ; `./` dans le dossier ; jamais de `../`. On importe le dossier d'un composant.
- **Composants de bas niveau** dans `components/UI/`, métier dans `components/`.
- **Couleurs** : le plan utilise les couleurs de la page ; seuls composants et liaisons ont des couleurs d'accent. Les liaisons ont chacune la leur (PoE bleu, VPN WireGuard bleu-vert à longs tirets : `--vpn` dans `index.css`).
- **Caméras** : un clic (sans glisser, ou Entrée) ouvre `CameraDialog` (`<dialog>`, `UI/Dialog`) ; un glissement de plus de 4 unités déplace (`DRAG_THRESHOLD`).
- **Three.js** : chargé avec `React.lazy` ; millimètres ; scène construite une fois, démontage qui libère tout (`forceContextLoss`) ; molette seule = défilement, Ctrl + molette = zoom ; rendu arrêté hors écran.
- **Tailwind uniquement**, thème dans `index.css`. Une seule classe par propriété sur un élément (ordre non garanti).
- TypeScript strict, pas de `any`.
- **Vue « Code »** : l'arbre s'affiche avec tous les dossiers fermés, un clic sur un dossier l'ouvre ou le ferme (`open`, `visibleNodes`). Tout fichier ajouté dans `code/stack` y apparaît ; son explication va dans `components/CodeBrowser/constants.ts` (`EXPLANATIONS` ; `UI.tsx`, `types.ts`, `constants.ts`, `helpers.ts`, `index.ts`, `CLAUDE.md` ont une explication générique dans `ROLE_EXPLANATIONS`).

## Pièges connus

- `typescript` bloqué en **~6.0** (`typescript-eslint` n'accepte pas la 7).
- Clé `localStorage` `house-diagram-vN` (`src/useDiagram.ts`) : **incrémenter N** quand le modèle ou le schéma par défaut change.
- Les liens dépendent de `x`, `y`, `w`, `h` des composants (`geometry.ts`). Canevas 900 × 540 (`CANVAS`) pour les deux étages ; plan dans `src/plan.ts`, styles dans `components/HousePlan/constants.ts` ; `toBox` pour dessiner les rectangles.
- Le glob de `CodeBrowser` ignore `node_modules`, `dist`, `storybook-static`, `package-lock.json` (sinon Vite recharge à chaque écriture).
- Dans le shell Bash de Claude Code, éviter les gros heredocs avec des apostrophes.
