# GuestPanel – l'onglet « Page invité »

La page « Chez Matou » (`../ChezMatou/CLAUDE.md`) vue du côté du propriétaire : de quoi la donner à un invité, et voir ce qu'elle montre.

- **En haut, le QR code** de `https://chezmatou.local:8080/chezmatou?k=<LAN_KEY>` (`qrcode.react`, dessiné dans le navigateur : modules noirs sur fond blanc avec marge, lisible en clair comme en sombre). Dessous : l'adresse en texte et « Copier ».
- L'adresse vient de `GET /guest-lan/link` (`lib/api.ts`), **derrière la clé de la WebApp** : c'est la seule route qui rend `LAN_KEY`. Le nom d'hôte est fixe (`LAN_HOST`, `chezmatou.local`, un alias mDNS du mini PC), pas celui de la page courante. Sans `LAN_KEY` : un message, pas de QR.
- **L'état en lecture seule** de chaque fonction (page, caméras, volets, lampes, clim : activé ou coupé) et la mention « Les interrupteurs sont dans House Sync » : on les bouge dans `sync/web` (`LanAccess`).
- **L'aperçu en direct** : un `iframe` de la page `/chezmatou` **de la même origine** que la WebApp (`previewOf`, avec la clé de l'adresse reçue), chargement différé, bordure arrondie. L'API n'envoie aucun `X-Frame-Options` ni CSP : rien à autoriser. Page coupée côté Sync : le cadre montre son message « désactivée ».
- Mobile d'abord (360 px), pas de défilement horizontal (adresse coupée en fin de ligne).
