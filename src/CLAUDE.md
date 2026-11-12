# Le site (`src/`) – modèle, schéma, règles métier, prix

Commandes et conventions de code : `../CLAUDE.md`. Vues Architecture : `components/Architecture/CLAUDE.md`. Vue Code : `components/CodeBrowser/CLAUDE.md`.

## Onglets

Cinq onglets (`components/App`) : Caméra, Lumière, Volet, Prise, Architecture.

- Les quatre domaines commencent par le bloc `components/Domain` : **en place**, puis **en préparation** (avec budget). Contenu dans `domotics.ts` (une entrée par élément, `price` en euros, absent tant que non relevé). Un chantier fait passe de « préparation » à « en place ».
- **Lumière**, **Prise** : ce bloc seulement.
- **Volet** : le bloc, plus :
  - schémas matériel et logiciel (`ShutterSystem`, via `ArchDiagram`) ;
  - schéma 3D ESP32 + CC1101 du volet de la cuisine (`ShutterWiring3D`) ;
  - dessous, schéma 3D des 9 servos des volets Nice (`ServoWiring3D`) : ESP32, carte PCA9685, 9 servos MF90 (canaux 0 à 8), 4 fils ESP32 vers carte, 3 fils par servo ;
  - sous ce schéma, la liste d'achats (`PURCHASES` dans `ServoWiring3D/constants.ts`, prix Amazon du 12 nov 2026) : à tenir à jour. `domotics.ts` ne porte que le total de la boîte (83,93 €), la liste détaillée n'est qu'ici.
  - Cotes du servo : projet `cnc`, `scripts/models/boite-volets-nice.mjs`. La carte ESP32 des deux schémas : `lib/esp32Board.ts`.
- **Caméra** : le bloc, le plan SVG interactif (deux étages, zoom, composants déplaçables), le panneau de détail, le dessin Reolink 2D/3D, le badge ⚡ secteur, le tableau des prix.
- **Architecture** : six vues, voir son CLAUDE.md.

## Le système modélisé

- **Maison** (`plan.ts`) : plain-pied avec jardin et sous-sol ; portail à l'ouest relié par un chemin à la porte du couloir.
- **Schéma par défaut** (`defaultNodes`, `defaultLinks` dans `nodes.ts`) :
  - `cam1` à `cam4` : `voliere-exterieur`, `voliere-interieur`, `salon-de-jardin`, `voliere-toit` (ports PoE 3, 4, 7, 8). Positions **schématiques** (l'emplacement réel est inconnu).
  - `swA` (switch) vers `mini` (composant libre, 479 €, 65 W : ACEMAGIC K1, Ryzen 5 7530U, 16 Go, SSD 1 To) et `box` (0 €).
  - `pc` (0 €) relié à la box en `wifi`. `remote` (téléphone en 4G) relié à la box par un lien `vpn` (WireGuard).
  - Pas de Pi, pas de k3s, pas de second switch.

## Fichiers

```
nodes.ts       types, modèles de composants, schéma par défaut, canevas
plan.ts        géométrie de la maison, locate
linkInfo.ts    libellés des liaisons
geometry.ts    tracé des liens, cadre du cluster (pur)
wiring.ts      autoWire : branchement automatique d'une caméra
useDiagram.ts  état du schéma, localStorage
catalog.ts     prix, compteurs, avertissements
domotics.ts    les quatre domaines
glossary.ts    glossaire
lib/           classes Tailwind, GlossaryContext, three.ts, esp32Board.ts
```

## Règles métier

- **Zones.** Une caméra a une zone (`ZONES`, `components/InfoPanel/constants.ts`). `autoWire` la branche sur un switch qui ne couvre pas encore cette zone, sinon sur le moins chargé (avec un seul switch, toujours lui).
- **Accès distant.** Le lien `vpn` = VPN WireGuard de la Freebox. Adresses et pare-feu : `../code/stack/docs/securite.md`.
- **Glossaire.** `components/UI/RichText` rend les termes cliquables (`GlossarySheet`, `GlossaryContext`). Jamais de `RichText` dans un `<button>`.
- **Étages.** `floor` (`rdc` ou `basement`) par composant ; un étage affiché, l'autre en filigrane.
- **Ajout de composants.** Plus aucun ajout par le tableau (Reolink, switch, mini PC sont fixes, sans +/−). Le type d'une liaison est déduit (`linkTypeFor`) ; une liaison se supprime seulement.
- **Secteur 230 V.** Switch et composants libres qui déclarent des watts (`isMainsNode`, `MAINS_WATTS`). Les caméras sont en PoE.
- **Reolink RLC-810A.** 4K 25 i/s H.265, flux principal 4 à 8 Mb/s, secondaire 64 à 512 kb/s, PoE 802.3af 12 W. 94,99 € l'unité (le tableau compte 74,50 € : lot de 2 à 149 €). 2 lecteurs du flux principal au plus, RTSP à activer, pas d'ONVIF.
- **Switch ES208GP** (69,99 €). 8 ports PoE+, 64 W, PoE coupable par port. Alerte au-delà de 8 caméras (`POE_PORTS_PER_SWITCH`) ; 64 W = 5 Reolink en pratique.
- **Prix** (`catalog.ts`) :
  - mini PC 479 € SSD compris, à prix saisi ; disque externe `disk` ajoutable (129 € + 6,95 €) ;
  - seul câble chiffré : rouleau Cat6 extérieur de 100 m (84,26 €), la ligne est un lien (`url` de `Line`) ;
  - une ligne à zéro disparaît, sauf un compteur réglable ;
  - prix « dépôt » de `github.com/mathieujullien77190/birds` (`docs/schema-electronique.md`), le reste estimé ;
  - composants libres et disque externe chiffrés à la main (`isPricedByHand`) ;
  - avertissements : ports manquants, trop de caméras par switch.

## Conventions du site

- **Couleurs** : le plan suit la page ; seuls composants et liaisons ont un accent, un par liaison (PoE bleu, VPN bleu-vert à longs tirets, `--vpn` dans `index.css`).
- **Caméras** : un clic (ou Entrée) ouvre `CameraDialog` ; un glissement de plus de 4 unités déplace (`DRAG_THRESHOLD`).
- **Three.js** : `React.lazy`, millimètres, scène construite une fois, démontage avec `forceContextLoss`, rendu arrêté hors écran. Ctrl + molette = zoom, sauf `ShutterWiring3D` et `ServoWiring3D` (molette seule).

## Pièges

- Clé `localStorage` `house-diagram-vN` (`useDiagram.ts`) : **incrémenter N** quand le modèle ou le schéma par défaut change.
- Les liens dépendent de `x`, `y`, `w`, `h` des composants (`geometry.ts`). Canevas 900 × 540 (`CANVAS`) pour les deux étages ; styles du plan dans `components/HousePlan/constants.ts` ; `toBox` pour les rectangles.
