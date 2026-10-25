# House – schéma et budget d'un système de caméras

## Présentation

Petit site React + TypeScript (Vite, Tailwind) pour **dessiner et chiffrer** un système de vidéosurveillance de maison. Tout s'exécute dans le navigateur : pas de serveur, pas d'API. Le schéma se sauvegarde dans le `localStorage`.

L'utilisateur voit une page avec :
- un **plan SVG interactif de la maison** sur deux étages (rez-de-chaussée avec le jardin, sous-sol), avec zoom +/−, composants déplaçables et traits qui suivent ;
- un **panneau de détail** pour modifier le composant ou la liaison sélectionnés ;
- un **dessin** de la caméra sélectionnée (Reolink, ou schéma de câblage de la mini-cam Pi Zero) ;
- la liste de ce qui se **branche au secteur** (badge ⚡ sur les composants du schéma) ;
- un **tableau des prix** relié au schéma.

## Le système modélisé

```
Caméras : Reolink PoE ou mini-cam Pi Zero (Pi Zero 2 W + Camera Module 3), toutes en PoE
   │  un câble RJ45 par caméra (données + alimentation)
   ▼
2 switchs PoE (A et B) reliés entre eux ; les caméras sont réparties entre les deux
   │  chaque Pi5 a un lien vers A et un lien vers B
   ▼
Cluster Kubernetes (k3s) : les Pi5 (control-plane + worker) et le Pi de sauvegarde (control-plane sans applications)
   ▼
Pi de sauvegarde (SSD), sur le secteur comme les Pi5
```

**La maison** (`src/plan.ts`) : plain-pied avec jardin autour et un sous-sol. Vue de dessus, au nord : chambre 1, salle de bain (étroite), cuisine, escalier qui descend au sous-sol (en haut à droite). Au milieu : couloir à gauche, entrée à droite (sous l'escalier). Au sud : chambre 2, et le salon en L qui monte jusqu'à la cuisine, sans couloir entre les deux, son mur gauche prolongeant le mur droit de la salle de bain. Le portail est à l'ouest, relié par un chemin à la porte, au bout ouest du couloir.

**Trois phases** (`Phase = 0 | 1 | 2`, `phases` sur chaque composant et chaque lien, `inPhase` dans `src/nodes.ts`). Le choix de phase (`PhaseSwitch`, trois cartes avec le budget de chacune) filtre le schéma, les panneaux et le tableau des prix.
- **Phase 0, version light** : 1 Reolink 4K vers le portail, 1 switch PoE, et le **PC** de la maison qui enregistre les flux RTSP sur son disque. Pas de Pi, pas de k3s. Les nœuds `pc` et `box` (internet) sont des composants perso à 0 € (déjà possédés) ; le téléphone (`phone`, dessiné comme un téléphone, dans le jardin) est relié à la box par un lien `wifi` en pointillés. Chaîne : `swA` → `pc` → `box` ← `phone`. Le switch alimente la caméra en PoE (un PC ne le fait pas) et sera réutilisé ensuite. Reolink comptée 74,50 € pièce (prix du lot de 2 ; 94,99 € à l'unité). Les panneaux secteur et k3s sont masqués et remplacés par `Phase0Architecture`.
- **Phase 1, strict minimum** : 3 Pi (2 Pi5 + le Pi de sauvegarde), 1 switch, 2 mini-cams Pi Zero. Tout est branché sur l'unique switch.
- **Phase 2, installation complète** : contient la phase 1 et ajoute le 2ᵉ switch, les 2 Reolink du portail et l'onduleur. Les caméras et les Pi se répartissent sur les deux switchs.

Le Pi de sauvegarde est sur le secteur, avec sa propre alimentation 27 W (ligne `pi-psu`), à toutes les phases : il n'y a pas de solaire.

**Architecture logicielle de la phase 0** (`Phase0Architecture`, quatre vues « Matériel », « Logiciel », « Code » et « Déploiement », données dans `constants.ts` ; « Code » est un navigateur de fichiers (`CodeBrowser`) du dossier `code/phase0`, avec le code et une explication par fichier ; « Déploiement » (`DeploymentPanel`) est le tableau des adresses réelles de la maison : box, switch, caméra, Frigate, WebApp, API, House Sync, CA, avec les comptes nommés mais jamais les mots de passe ; l'intro de chaque vue est en paragraphes courts). Ce n'est qu'un schéma : le site n'exécute rien de tout ça. Il décrit trois conteneurs Docker (docker compose) sur le PC :
- **Frigate** (avec go2rtc) : ouvre une seule connexion RTSP vers la caméra, détecte le mouvement et enregistre les clips.
- **House Sync**, un script : interroge l'API HTTP de Frigate par polling (sans Mosquitto), copie les clips sur le disque backup (déplaçable plus tard sur le Pi de sauvegarde) et écrit dans SQLite les événements, l'adresse de la dernière image et l'adresse iframe de chaque caméra. Il est le seul à écrire. Les disques backup et SQLite sont dessinés dans son conteneur.
- **House API + WebApp** : l'API est en lecture seule et n'appelle jamais Frigate, elle lit SQLite et le disque backup (clips). Services : auth (l'utilisateur donne sa clé secrète), direct (lien iframe), image (dernière image), events (le dernier ou tous) ; plus tard poe, qui appelle le contrôleur Omada pour couper ou relancer le PoE d'une caméra (compte aux droits minimaux, jeton en variable d'environnement). Le navigateur de l'utilisateur ouvre la WebApp, puis charge directement le direct et l'image depuis Frigate.
- **Sécurité** : House Sync se connecte à Frigate avec un compte viewer sur le port 8971 ; le port 5000, sans mot de passe, n'est jamais publié ; le pare-feu du PC n'accepte que le réseau de la maison.
- **Deux connexions, par choix** : l'utilisateur se connecte à Frigate (port 8971, cookie de session) pour le direct et l'image, que son navigateur charge sans passer par l'API ; et il donne une clé secrète à l'API (jamais dans le code de la WebApp : saisie une fois, comparée à chaque requête, hors du code) pour les événements, les clips et `poe`. Il faut une clé distincte pour `poe`, et l'API doit être authentifiée avant d'exposer les clips. Les identifiants de Frigate (compte viewer de House Sync) et d'Omada sont dans des variables d'environnement de l'API et de House Sync, jamais dans le navigateur. Un mandataire d'authentification devant Frigate permettrait plus tard de n'avoir qu'une seule connexion.

`DEFAULT_VIEW` doit rester `'hardware'`.

**Schéma de départ, phase 2** (`defaultNodes` dans `src/nodes.ts`) :
- *rez-de-chaussée* : 2 Reolink vers le portail (zone Portail, à l'ouest), 2 mini-cams Pi Zero dans le nichoir (un simple carré dans le jardin, zone Nichoir), 1 switch PoE, 1 Pi5 et le Pi de sauvegarde dans le salon ;
- *sous-sol* : 1 switch PoE et 1 Pi5.

La mini-cam Pi Zero n'utilise pas le WiFi : un splitter PoE sépare le courant (5 V) des données (RJ45), et les données arrivent au Pi Zero par un adaptateur Ethernet USB-OTG.

## Règles métier

- **Zones.** Une caméra a une zone choisie dans une liste prédéfinie (`ZONES` dans `components/InfoPanel/constants.ts`). Quand la zone d'une caméra change, elle est rebranchée (`autoWire`, `src/wiring.ts`) : sur **l'autre switch** si la zone est déjà couverte par une autre caméra (redondance), sinon sur le switch le moins chargé. Un message explique le choix.
- **Cluster k3s.** Le Pi de sauvegarde est le 3ᵉ nœud control-plane (etcd embarqué, quorum) : il porte le taint `node-role.kubernetes.io/backup=true:NoSchedule`, donc aucune application n'y est planifiée, seulement des jobs de sauvegarde (toleration + `nodeSelector role=backup`). `isK3sKind` (`src/nodes.ts`) désigne les nœuds du cluster ; le panneau `K3sPanel` liste leurs rôles, les règles et les commandes d'installation. Le quorum compte les Pi5 + le Pi de sauvegarde (≥ 3 nœuds).
- **Panneau de détail.** Un clic sur un composant affiche son nom, sa description, sa zone (caméras), sa **position** (pièce et étage, `locate` dans `src/plan.ts`) et la liste de ses **liens** avec une description (`src/linkInfo.ts`). Ses liens sont mis en évidence dans le schéma (plus épais, avec un halo, en gardant la couleur de leur type) et les autres sont estompés.
- **Glossaire.** Les termes techniques (RTSP, PoE, RSTP, k3s, etcd, quorum, taint…) sont définis dans `src/glossary.ts`. Dans les textes passés à `components/UI/RichText`, ils deviennent cliquables (soulignés en pointillés) et ouvrent un bloc `BottomSheet` qui monte depuis le bas avec la définition (`GlossarySheet`). `RichText` ouvre le bloc via `GlossaryContext` (`src/lib/glossaryContext.ts`), fourni par `App`. Pour ajouter un terme : une entrée dans `GLOSSARY` avec ses écritures reconnues (`match`). Ne pas mettre de `RichText` dans un `<button>` (boutons imbriqués).
- **Étages.** Chaque composant a un `floor` (`rdc` ou `basement`, `templates[kind].floor` par défaut). Le schéma n'affiche qu'un étage à la fois ; les composants et liens de l'autre étage restent visibles en filigrane (non interactifs). Ajouter un composant bascule sur son étage.
- **Composants ajoutés** (boutons +/− du tableau des prix). Une caméra suit la règle des zones. Un Pi5 est relié à tous les switchs, un switch à tous les Pi5 et au premier autre switch, un Pi de sauvegarde au switch le moins chargé (`wireInfra`, `src/wiring.ts`). Il n'y a pas de création manuelle de liaison, et le type d'une liaison (PoE, Ethernet, WiFi) est déduit des deux extrémités (`linkTypeFor`) : il ne se choisit pas. Une liaison peut seulement être supprimée. Les composants ne se suppriment pas depuis le panneau de détail : on les retire avec les boutons − du tableau des prix.
- **Secteur 230 V.** Seuls les switchs, les Pi5 et le Pi de sauvegarde se branchent au secteur (`isMainsKind`, `MAINS_WATTS` dans `src/nodes.ts`), plus l'onduleur. Les caméras sont alimentées en PoE par les switchs.
- **Reolink RLC-810A** (fiche officielle reolink.com/fr) : 4K 8 Mpx à 25 images/s, H.265, flux principal 4 à 8 Mb/s (6 par défaut), flux secondaire 64 à 512 kb/s, PoE 802.3af, 12 W max, IP67, 60 × 66 × 192 mm, 485 g, 94,99 € (1 caméra, objectif 4 mm). **Limites** : 12 flux simultanés au plus, dont **2 flux principaux seulement** (ne pas faire lire le flux principal par plus de deux clients) ; RTSP à activer dans les ports de la caméra ; **ONVIF non listé** sur la fiche ; enregistrements envoyables par **FTP** ; pas d'instantané par adresse web documenté.
- **Switch.** Le modèle retenu est le TP-Link Omada ES208GP (69,99 €) : 8 ports Gigabit **tous PoE+**, budget PoE de 64 W (non garanti, fiche TP-Link), **administrable** via Omada (« Easy Managed ») : le PoE se coupe ou se relance port par port, avec « Remote Camera Reboot » et la reprise automatique du PoE (mode autonome) d'après la fiche. Le schéma garde un seul câble entre les deux switchs et aucune boucle, sans RSTP : le modèle n'a que la détection de boucle (loopback detection), pas de spanning tree. Le bonding active-backup des Pi5 se règle côté Linux, sans configuration du switch. Un avertissement signale plus de 8 caméras par switch (`POE_PORTS_PER_SWITCH`) ; le budget de 64 W limite en pratique à 5 Reolink de 12 W par switch.
- **Prix.** Le tableau se calcule à partir des composants du schéma ; les 3 Pi (2 Pi5 du cluster et le Pi de sauvegarde) sont regroupés dans un seul groupe « Raspberry Pi ». Les prix « dépôt » viennent de `github.com/mathieujullien77190/birds` (`docs/schema-electronique.md`) ; tous les autres sont des **estimations** à confirmer. Des avertissements signalent un manque de ports sur les switchs, l'absence de redondance (un seul switch) et moins de 3 nœuds k3s (Pi5 + Pi de sauvegarde, pas de quorum etcd).

## Code de la phase 0

Le dossier `code/phase0/` (hors du site, ignoré par ESLint) contient la pile de la phase 0 : `docker-compose.yml`, `.env.example` (le vrai `.env` est ignoré par git), `certs/` (CA de la maison), `frigate/`, `sync/` (House Sync), `api/` (House API) et `web/` (WebApp). House Sync et House API : TypeScript exécuté directement par Node 24, sans dépendance. La WebApp est un **projet Vite + React + TypeScript à part** (`web/package.json`, mêmes conventions que le site : un dossier par composant, Tailwind, alias `@/`), compilé dans l'image Docker de l'API qui sert son `dist`. Trois onglets après la clé : Caméras (nom, dernière image, frise `Timeline` des événements sur 1 h à 7 j, clip de l'événement cliqué), API (explorateur des services), Frigate (iframe) ; pas d'onglet de plus. House Sync sert **sa propre page** sur le port 8081 (HTTPS, même clé, rendu HTML côté serveur dans `sync/src/page.ts`) : sa base SQLite table par table et les fichiers du disque backup, pour contrôler ce qu'il fait. L'API lit SQLite et le disque backup pour ses services mais n'expose jamais la base brute : c'est House Sync, seul écrivain, qui la montre. Tout fichier ajouté ou modifié apparaît dans la vue « Code » ; ajouter son explication dans `components/CodeBrowser/constants.ts` (`EXPLANATIONS` ; les fichiers de rôle `UI.tsx`, `types.ts`, `constants.ts`, `helpers.ts`, `index.ts` ont une explication générique dans `ROLE_EXPLANATIONS`).

## Commandes

```
npm run dev        # serveur Vite (ouvre le navigateur)
npm run typecheck  # tsc
npm run lint       # eslint
npm run build      # tsc puis vite build
```

Avant de rendre un travail, `npx tsc`, `npx eslint .` et `npm run build` doivent passer.

## Organisation du code

```
src/
├── main.tsx        point d'entrée
├── index.css       Tailwind et couleurs du thème (clair/sombre selon le système)
├── nodes.ts        modèle : types, modèles de composants (templates), schéma par défaut, taille du canevas
├── plan.ts         géométrie de la maison (pièces, jardin, portail, nichoir) et localisation d'un composant
├── linkInfo.ts     libellés et descriptions des liaisons
├── geometry.ts     tracé des liens et cadre du cluster (fonctions pures)
├── wiring.ts       branchements automatiques : autoWire (caméras) et wireInfra (Pi5, switchs, backup)
├── useDiagram.ts   état du schéma : ajout, déplacement, zones, liens, sauvegarde localStorage
├── catalog.ts      catalogue de prix, compteurs de composants, avertissements
├── lib/            classes Tailwind partagées (liens, dessins)
└── components/
    ├── App/                  assemble la page (en-tête fixe, phases, schéma, panneaux)
    ├── PhaseSwitch/          choix de la phase 0 / 1 / 2, avec le budget de chacune
    ├── Diagram/              schéma SVG : étage, glisser, clavier, zoom, mode secteur
    ├── HousePlan/            fond du schéma : plan de la maison, du jardin et du sous-sol
    ├── DiagramNode/          un composant du schéma
    ├── InfoPanel/            détail du composant ou de la liaison sélectionnés
    ├── Legend/               légende des liens et du badge secteur
    ├── K3sPanel/             nœuds du cluster k3s, règles et commandes d'installation
    ├── Phase0Architecture/   architecture de la phase 0 : vues matériel, logiciel, code et déploiement (données dans constants.ts)
    ├── DeploymentPanel/      adresses réelles de la phase 0 (box, switch, caméra, Frigate, WebApp, API, House Sync, CA), comptes sans mot de passe
    ├── CodeBrowser/          navigateur de fichiers de code/phase0 : arbre, explication et code de chaque fichier (lus à la compilation)
    ├── MainsPanel/           liste de ce qui se branche au secteur 230 V (prises, puissance)
    ├── Pricing/              tableau des prix
    ├── CameraDialog/         boîte de dialogue d'une caméra : schéma 2D ou vue 3D (chargée à la demande)
    ├── CameraModel3D/        vue 3D three.js : mini-cam (Pi Zero 2 W, Camera Module 3, nappe, splitter, adaptateur) ou Reolink
    ├── ReolinkDrawing/       dessin de la Reolink
    ├── PiZeroSchematic/      schéma de câblage de la mini-cam Pi Zero
    ├── GlossarySheet/        bloc de définition d'un terme du glossaire
    └── UI/                   briques de bas niveau : Button, Card, Field, Select, Badge, Stepper, SegmentedControl, RichText, BottomSheet, Dialog
```

## Conventions de code

- **Un dossier par composant** (skill global `react-component`) : `Nom.tsx` (conteneur : état, hooks, handlers), `UI.tsx` (rendu pur), `helpers.ts` (fonctions pures), `constants.ts` (valeurs et classes Tailwind), `types.ts`, `index.ts` (export par défaut + types).
- **Logique séparée du rendu** : `UI.tsx` n'a ni état métier ni calcul, tout lui arrive par props.
- **Fonctions fléchées partout** (`const f = () => {}`), jamais de `function`. Pour un composant, `export default` en fin de fichier.
- **Alias `@/` = `src/`** pour tout import hors du dossier courant (`@/nodes`, `@/components/UI/Button`). `./` seulement pour les fichiers du même dossier, jamais de `../`. On importe le **dossier** d'un composant, pas un fichier interne.
- **Composants de bas niveau** dans `components/UI/`, composants métier directement dans `components/`.
- **Couleurs** : le plan de la maison utilise les couleurs de la page (`bg-bg`, `bg-card`, `border-line`, `text-muted`) ; seuls les composants et les liaisons ont leurs couleurs d'accent.
- **Caméras.** Un clic sur une caméra du schéma (sans glisser, ou Entrée au clavier) ouvre `CameraDialog`, une boîte de dialogue native (`<dialog>`, composant `UI/Dialog`) avec le schéma 2D et la vue 3D. Un glissement de plus de 4 unités déplace le composant au lieu d'ouvrir la boîte (`DRAG_THRESHOLD`).
- **Three.js** : la vue 3D est chargée avec `React.lazy` pour ne pas alourdir le premier affichage. Dimensions en millimètres (1 unité = 1 mm), approximatives. La scène (`CameraModel3D/helpers.ts`) est construite une fois ; les boutons n'agissent que sur des objets existants (rotation, visibilité) et le démontage libère géométries, matériaux et le contexte WebGL (`forceContextLoss`) : les navigateurs en limitent le nombre. La molette seule fait défiler la page, Ctrl + molette zoome, et le rendu s'arrête hors écran.
- **Tailwind uniquement** : pas de CSS à part, sauf le thème dans `index.css`. Les couleurs passent par les jetons `bg-bg`, `text-fg`, `border-line`, `stroke-camera`, etc. Sur un même élément, une seule classe par propriété : l'ordre n'est pas garanti, donc on choisit la classe avec une fonction d'aide.
- TypeScript strict, pas de `any`.

## Pièges connus

- `typescript` est bloqué en **~6.0** : `typescript-eslint` n'accepte pas encore la 7.
- La clé `localStorage` du schéma est `house-diagram-vN` (`src/useDiagram.ts`). **Incrémenter N** quand le modèle de données ou le schéma par défaut change, sinon d'anciens schémas persistent.
- Les liens dépendent de la position des composants (`geometry.ts`) : chaque composant doit garder `x`, `y`, `w`, `h`. Le canevas fait 900 × 540 (`CANVAS`, `src/nodes.ts`) et sert aux deux étages ; les coordonnées du plan sont dans `src/plan.ts` (styles dans `components/HousePlan/constants.ts`). Les rectangles du plan utilisent `w`/`h` : passer par `toBox` pour les dessiner en SVG.
- Dans le shell Bash de Claude Code, éviter les gros heredocs contenant des apostrophes : écrire le script dans un fichier, puis l'exécuter.
