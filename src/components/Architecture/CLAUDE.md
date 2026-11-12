# Architecture – les six vues

Onglet `Architecture.tsx`, données dans `constants.ts` (`ARCHITECTURE`). `DEFAULT_VIEW` reste `'hardware'`.

- **Matériel** et **Logiciel** : schémas SVG de `ArchDiagram`, avec l'accès WireGuard (`vpn: true` = le tunnel).
  - Les 4 caméras sont dessinées une à une (`cam1` à `cam4` en Matériel, `stream1`-`4` et `rtsp1`-`4` en Logiciel) : en ajouter une change la géométrie (hauteur des panneaux, `viewBox`).
  - Conteneurs : 4 en service (go2rtc, motion, sync, api), `certs` (éphémère), `guest` (éteinte par défaut).
- **Réglages** : ce que font les réglages de House Sync selon leur valeur. À tenir avec `code/stack/sync/CLAUDE.md`.
- **Interfaces** (`InterfacesMap`) : les deux apps web, la page invité, `@house/ui`, Storybook, House API (pastilles par `layoutColumns`).
  - Le Storybook est servi par le site : `npm run build:storybook` le compile dans `public/storybook/` (ignoré par git), servi à `/storybook/index.html`.
  - À refaire quand les composants ou stories de `@house/ui` changent.
- **Code** : `../CodeBrowser/CLAUDE.md`.
- **Déploiement** (`DeploymentPanel`) : adresses réelles, accès distant, comptes nommés, jamais de mot de passe.

Ces vues décrivent `code/stack/` : si la pile change, elles changent.
