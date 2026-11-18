# LanAccess – le bloc « Page invité du réseau »

Contenu du bloc repliable « Page invité du réseau » de l'onglet Réglages (`../SettingsSection/CLAUDE.md`). La page elle-même (`/chezmatou`) est celle de la WebApp (`../../../../../web/src/components/ChezMatou/CLAUDE.md`) ; ici on décide ce qu'elle permet.

- Cinq interrupteurs, **tout coupé par défaut** : l'**interrupteur général** (coupé, la page et toutes ses routes sont refusées) puis les quatre fonctions : voir les deux caméras des perruches, ouvrir et fermer les volets, allumer et éteindre les lampes, gérer les climatisations.
- Un interrupteur est enregistré tout de suite (`PUT /api/lan-access` avec `{<clé>: bool}`, `lib/api.ts`) ; l'échec affiche un message. House API relit le document `lan-access` de `house_state` à chaque demande : le changement vaut aussitôt.
- Sous les interrupteurs : l'adresse de la page (`LAN_PAGE_URL`, sans la clé) et un rappel : la clé `LAN_KEY` reste dans le `.env` du mini PC ; le lien complet avec la clé est dans le QR code de l'onglet « Page invité » de la WebApp.
- Stockage et validation : `../../../../src/CLAUDE.md` (« Page invité du réseau »). Rendu pur dans `UI.tsx`.
