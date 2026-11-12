# Le site (`src/`) – modèle, schéma, règles métier, prix

Détail du site React. Présentation, commandes et conventions de code : `../CLAUDE.md`. Vues Architecture : `components/Architecture/CLAUDE.md`. Vue Code : `components/CodeBrowser/CLAUDE.md`.

## Les onglets

Cinq onglets (`components/App`, `SegmentedControl`) : **Caméra**, **Lumière**, **Volet**, **Prise**, **Architecture**. Les quatre domaines commencent par le même bloc (`components/Domain`) : **ce qui est en place**, puis **ce qui est en préparation** (avec le budget connu). Son contenu est dans `domotics.ts` (une entrée par élément ; `price` en euros, absent tant qu'on ne l'a pas relevé) : on y ajoute un achat ou un chantier, et on le déplace de « préparation » à « en place » une fois fait.

- **Lumière** et **Prise** : ce bloc seulement.
- **Volet** : le bloc, plus les schémas **matériel et logiciel** des volets (`ShutterSystem`, dessinés par `ArchDiagram`), le **schéma 3D du montage** ESP32 + CC1101 (`ShutterWiring3D`, à la demande : courant, 8 fils colorés, noms des broches, vue du dessus), et **dessous** le **schéma 3D des 9 servos des volets Nice** (`ServoWiring3D` : une ESP32, une **carte PCA9685** (16 canaux, I2C, 61 × 25 mm : bornier vert pour le 5 V des servos, condensateur, connecteur de commande de 6 broches, chaque canal à trois broches signal jaune / + rouge / GND noir) et 9 servos Miuzei MF90 debout avec leur corne noire ; **4 fils** de l'ESP32 à la carte (3,3 V sur VCC, masse, SDA sur G21, SCL sur G22), **trois fils par servo** (marron, rouge et un signal de couleur propre) jusqu'aux trois broches de son canal (canaux 0 à 8, de la télécommande PC à PORTE, monter / stop / descendre), le bloc 5 V relié au bornier ; hors de la boîte, seulement les branchements ; mêmes boutons que le schéma du dessus, deux légendes (les 4 fils, les 9 servos avec leur canal) ; les cotes du servo viennent du projet `cnc`, `scripts/models/boite-volets-nice.mjs` ; **sous le schéma, la liste d'achats** (`PURCHASES` dans `ServoWiring3D/constants.ts` : servos MF90, carte PCA9685, ESP32, alimentation 5 V 3 A, connecteurs DC à bornes ; les fils, que l'utilisateur a déjà, n'y sont pas ; prix relevés sur Amazon le 12 novembre 2026, liens quand on les a, total des lignes dont le prix est relevé : à tenir à jour quand on achète ou qu'un prix change)). La carte ESP32 des deux schémas est dessinée par `lib/esp32Board.ts`.
- **Caméra** : le bloc, plus le **plan SVG interactif** (deux étages, zoom +/−, composants déplaçables, traits qui suivent), le **panneau de détail** du composant ou de la liaison sélectionnés, le **dessin** de la caméra (Reolink, 2D et 3D), ce qui se **branche au secteur** (badge ⚡) et le **tableau des prix** relié au schéma.
- **Architecture** : six vues, voir son CLAUDE.md.

Le site décrit l'**état actuel** : plus de phases ni de scénarios.

## Le système modélisé

**La maison** (`plan.ts`) : plain-pied avec jardin et sous-sol. Au nord : chambre 1, salle de bain, cuisine, escalier (en haut à droite). Au milieu : couloir à gauche, entrée à droite. Au sud : chambre 2 et le salon en L qui monte jusqu'à la cuisine. Portail à l'ouest, relié par un chemin à la porte au bout du couloir.

**Le schéma** (`defaultNodes` et `defaultLinks`, `nodes.ts`) : `cam1` et `cam2` (2 Reolink au portail) → `swA` (le switch) → `mini` (composant libre à 479 €, 65 W : ACEMAGIC K1, Ryzen 5 7530U, 16 Go, SSD M.2 1 To, un port Ethernet 1 Gb/s, Linux + Docker) et `box` (la box, 0 €) ; `pc` (le PC de la maison, composant libre à 0 €, relié à la box en `wifi`) ; `remote` (le téléphone en 4G, hors de la maison, dans le jardin en haut à droite) relié à la box par un lien `vpn` (WireGuard, bleu-vert, longs tirets). Pas de Pi, pas de k3s (écartés : plus chers et moins puissants), pas de second switch.

## Fichiers

```
nodes.ts        modèle : types, modèles de composants, schéma par défaut, taille du canevas
plan.ts         géométrie de la maison et localisation d'un composant (locate)
linkInfo.ts     libellés et descriptions des liaisons
geometry.ts     tracé des liens et cadre du cluster (fonctions pures)
wiring.ts       branchement automatique d'une caméra : autoWire
useDiagram.ts   état du schéma : ajout, déplacement, zones, liens, localStorage
catalog.ts      catalogue de prix, compteurs, avertissements
domotics.ts     les quatre domaines : en place, en préparation, prix
glossary.ts     termes du glossaire
lib/            classes Tailwind partagées, GlossaryContext, three.ts (WebGL pris en charge, libération des objets three.js), esp32Board.ts (la carte ESP32 38 broches en 3D, ses broches et ses noms, pour les deux schémas de montage)
components/     un dossier par composant (liste : `ls components`) ; bas niveau dans UI/, métier à côté
```

## Règles métier

- **Zones.** Une caméra a une zone (`ZONES`, `components/InfoPanel/constants.ts`). Quand elle change, `autoWire` la branche sur un switch qui ne couvre pas encore cette zone (redondance), sinon sur le moins chargé. Le schéma par défaut n'a qu'un switch : elle le choisit toujours.
- **Accès distant.** Le lien `vpn` du schéma (`LinkType`) représente le VPN WireGuard de la Freebox ; adresses et pare-feu : `../code/stack/docs/securite.md`.
- **Panneau de détail.** Nom, description, zone, position (`locate`), liens décrits (`linkInfo.ts`) et mis en évidence dans le schéma.
- **Glossaire.** Termes dans `glossary.ts` ; `components/UI/RichText` les rend cliquables et ouvre `GlossarySheet` (via `GlossaryContext`, `lib/glossaryContext.ts`). Jamais de `RichText` dans un `<button>`.
- **Étages.** `floor` (`rdc` ou `basement`) sur chaque composant ; un étage affiché à la fois, l'autre en filigrane.
- **Composants ajoutés** (boutons +/− des prix) : aucun composant ne s'ajoute plus par le tableau (Reolink, switch et mini PC sont fixes, sans +/−) ; une caméra ajoutée autrement se brancherait selon sa zone. Le type d'une liaison est déduit (`linkTypeFor`) ; une liaison se supprime seulement ; un composant se retire par le bouton −.
- **Secteur 230 V.** Le switch et les composants libres qui déclarent des watts, comme le mini PC (`isMainsNode`, `MAINS_WATTS`). Les caméras sont en PoE.
- **Reolink RLC-810A** : 4K 25 i/s H.265, flux principal 4 à 8 Mb/s, flux secondaire 64 à 512 kb/s, PoE 802.3af 12 W, 94,99 € à l'unité (le tableau compte 74,50 € : lot de 2 à 149 €). 2 lecteurs du flux principal au plus ; RTSP à activer dans la caméra ; pas d'ONVIF.
- **Switch TP-Link Omada ES208GP** (69,99 €) : 8 ports PoE+, 64 W, administrable (PoE coupable port par port, reprise automatique). Avertissement au-delà de 8 caméras par switch (`POE_PORTS_PER_SWITCH`) ; 64 W = 5 Reolink en pratique.
- **Prix.** Calculés depuis le schéma (`catalog.ts`). Le mini PC (479 €, SSD de 1 To compris) est un composant à prix saisi (un disque externe `disk` reste ajoutable : 129 € plus 6,95 € d'adaptateur) ; le seul câble chiffré est le rouleau de 100 m d'Ethernet Cat6 d'extérieur pour les caméras (deleyCON, 84,26 €, Amazon) ; la ligne du tableau est un lien vers la fiche (`url` de `Line`). Rien n'est grisé : une ligne à zéro disparaît, sauf un compteur réglable. Prix « dépôt » depuis `github.com/mathieujullien77190/birds` (`docs/schema-electronique.md`), le reste estimé. Le disque dur externe et les composants libres se chiffrent à la main (`isPricedByHand`). Avertissements : ports manquants, trop de caméras PoE par switch.

## Conventions propres au site

- **Couleurs** : le plan utilise les couleurs de la page ; seuls composants et liaisons ont des couleurs d'accent, chaque liaison la sienne (PoE bleu, VPN bleu-vert à longs tirets : `--vpn` dans `index.css`).
- **Caméras** : un clic (sans glisser, ou Entrée) ouvre `CameraDialog` (`<dialog>`, `UI/Dialog`) ; un glissement de plus de 4 unités déplace (`DRAG_THRESHOLD`).
- **Three.js** : chargé avec `React.lazy` ; millimètres ; scène construite une fois, démontage qui libère tout (`forceContextLoss`) ; molette seule = défilement, Ctrl + molette = zoom (sauf `ShutterWiring3D` et `ServoWiring3D` : la molette zoome) ; rendu arrêté hors écran.

## Pièges

- Clé `localStorage` `house-diagram-vN` (`useDiagram.ts`) : **incrémenter N** quand le modèle ou le schéma par défaut change.
- Les liens dépendent de `x`, `y`, `w`, `h` des composants (`geometry.ts`). Canevas 900 × 540 (`CANVAS`) pour les deux étages ; plan dans `plan.ts`, styles dans `components/HousePlan/constants.ts` ; `toBox` pour dessiner les rectangles.
