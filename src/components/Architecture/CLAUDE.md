# Architecture – les six vues du système

Onglet **Architecture** (`Architecture.tsx`) ; données dans `constants.ts` (`ARCHITECTURE`). `DEFAULT_VIEW` reste `'hardware'`.

- **Matériel** et **Logiciel** : schémas SVG dessinés par `ArchDiagram` à partir de données, avec l'accès distant WireGuard (un cadre « Hors de la maison », le tunnel en bleu, le serveur VPN de la Freebox). Une flèche `vpn: true` est le tunnel. Les **quatre caméras** (`voliere-exterieur`, `voliere-interieur`, `salon-de-jardin`, `voliere-toit`, ports PoE 3, 4, 7 et 8) y sont dessinées une à une (boîtes et flèches `cam1` à `cam4` en Matériel, `stream1` à `stream4` et `rtsp1` à `rtsp4` en Logiciel) : en ajouter une change la géométrie (hauteur des panneaux, `viewBox`). Les conteneurs : quatre en service (go2rtc, motion, sync, api), plus `certs` (éphémère) et `guest` (éteinte par défaut).
- **Réglages** : le schéma de ce que font les réglages de la sauvegarde de House Sync selon leur valeur (clips toujours, la nuit ou jamais, rythme des images, cadence du direct 4K). À mettre à jour avec `code/stack/sync/CLAUDE.md`.
- **Interfaces** (`InterfacesMap`) : l'architecture des deux apps web, de la page invité, de `@house/ui`, de Storybook et de House API ; pastilles posées par `layoutColumns`. Le Storybook est servi avec le site : `npm run build:storybook` (racine) le compile dans `public/storybook/` (ignoré par git), Vite le sert à `/storybook/index.html`. À refaire quand les composants ou les stories de `@house/ui` changent.
- **Code** (`CodeBrowser`) : voir `../CodeBrowser/CLAUDE.md`.
- **Déploiement** (`DeploymentPanel`) : les adresses réelles de la maison, l'accès distant, comptes nommés, jamais de mot de passe.

La pile décrite ici vit dans `code/stack/` (`code/stack/CLAUDE.md`) : si elle change, ces vues changent.
