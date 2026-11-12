# sync/web – la page de House Sync

Projet Vite + React + TypeScript à part, mêmes conventions que le site (`../../CLAUDE.md`). Compilé dans l'image de House Sync, servi sur le port 8081 (clé et session : `../../docs/securite.md`). Le rendu vient de **`@house/ui`** (`../../ui`) : ici, seulement les conteneurs.

## Structure

- `lib/api.ts` : services de House Sync, session par cookie.
- `components/App` : `TopBar` toujours visible (titre, onglets, heure de mise à jour, « Quitter » ; sur téléphone, un menu « sandwich »), la clé, puis cinq onglets.
- Tous les blocs se replient (`Collapsible`) ; « Caractéristiques » l'est au départ.

## Onglets

- **Base** : tables de la base (`TableSection` : `components/TableSection/CLAUDE.md`).
- **Disque** : clips du disque backup (`ClipsSection`).
  - Une table, deux vues (« Sauvegardés » / « Les autres », filtres caméra et date), une ligne par événement.
  - Deux versions par ligne (légère H.264 720p, original H.265 4K), regroupées par `groupClips`.
- **Machine** : caractéristiques, réseau, pont Hue (si adresse réglée), adresses IP, courbes, camemberts, arbre de consommation.
  - Courbes en direct relues toutes les 2 s ; « Processeur par thread » repliée par défaut (`cpu.perThread`, 2 min d'historique).
  - **Adresses IP de la maison** : tableau écrit à la main (`ADDRESS_ROWS` dans `App/constants.ts`) : **à tenir à jour quand une adresse change**.
  - **Arbre unique** « Consommation électrique (estimation) » (`components/EnergyTree`, `lib/energyTree.ts` : `buildEnergyTree`) :
    - racine = somme ; branches Caméras, Lampes Hue, Mini PC (processeur seul) ; une feuille par caméra et par lampe ;
    - chaque nœud : puissance (W), énergie (kWh) et coût (€) depuis le début du suivi ; un groupe somme ses enfants (puissance inconnue = 0) ;
    - **groupes fermés au départ** ; source absente = pas de branche ; aucune source = un message.
- **Docker** : une fiche par conteneur.
- **Réglages** : `SettingsSection` (`components/SettingsSection/CLAUDE.md`).

## Chargement

- **Seule la page affichée est chargée** (`loadTab` dans `App.tsx`), puis relue toutes les 15 s (sauf média ouvert) ; `refreshTick` fait recharger les tableaux.
- Base et Disque : `GET /api/overview?part=database` (sans parcourir le disque). Machine : disque, processeur, caractéristiques, réseau, Hue en plus. Docker : Docker seul. Réglages : se lisent eux-mêmes.
- `MediaPanel` : clip ou image ouvert dans le panneau collant de `@house/ui` ; la vidéo démarre à l'ouverture, Fermer l'arrête.

## Tests et développement

- `npm test` (Vitest, jsdom, Testing Library) ; `npm run test:coverage` **échoue sous 100 %** sur `src/**` (pas `@house/ui`, qui a ses essais). Config dans `vite.config.ts` (clé `test`).
- `lib/api.ts` se teste avec un `fetch` simulé, les conteneurs avec `vi.mock('@/lib/api')`.
- Hors couverture : `main.tsx`, `types.ts`, `lib/fixtures.ts`, `test-setup.ts`.
- Dev : `npm run dev` (HTTPS sur 5181 avec le certificat de `data/certs`, services relayés vers House Sync).
- Vérifications : `npm run typecheck && npm run lint && npm run test:coverage && npm run build`.
