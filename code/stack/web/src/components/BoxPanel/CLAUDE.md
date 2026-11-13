# BoxPanel et BoxPreview – l'onglet Box

La Freebox (`GET /box`, `PUT /box/wifi`, relue toutes les 12 s par `lib/useBox.ts`). Ce que fait l'API, les variables `FREEBOX_*` et le secret : `../../../../api/src/routes/CLAUDE.md` (« Freebox »).

- `BoxBlock.tsx` est **partagé** par l'onglet (`BoxPanel`) et l'aperçu de la carte (`BoxPreview`, en `compact`).
- Bloc : nom et modèle, **interrupteur WiFi** (`role="switch"`), état de la ligne (débits en Mb/s, adresse IP, durée d'allumage, firmware), tableau « Appareils du réseau » (ceux de la maison et les baux DHCP statiques, connectés ou non : pastille d'état, nom, IP, bail, icône du type) ; un invité n'y figure pas. Chaque bloc a son liseré d'état (`StatusFrame`).
- **Couper le WiFi demande une confirmation** (« Couper » / « Annuler ») ; l'allumer est direct. Interrupteur grisé et « Envoi à la box… » pendant l'ordre ; la réponse de l'API remplace l'état.
- **WiFi invité** (`GuestWifi`, en bas du bloc WiFi) : nom du réseau et mot de passe lus à la demande (`GET /box/guest-wifi`), copiables, jamais gardés une fois masqués.
- Jeton absent côté API (`configured: false`) : l'onglet l'écrit. Box muette (`reachable: false`) : « La box ne répond pas. »
- **Appareils invités** (`GuestsBlock.tsx`, `lib/useBoxGuests.ts`, relu toutes les 30 s, onglet seulement) : sous le bloc de la box, dans un `StatusFrame`, titre « Appareils invités » puis le tableau des invités connectés ou exclus (nom, IP, type en icône `DeviceIcon`, première et dernière vue, état, exclu). Par ligne : « Exclure » (direct, sans confirmation) ou « Réadmettre ». Exclure passe par le filtrage MAC **du WiFi** de la box (un appareil câblé n'est pas touché ; droit « Modification des réglages » requis ; box en liste blanche : message d'erreur). Règles : `api/src/routes/CLAUDE.md` (« Invités de la box »).
- `BoxPreview` : `StatusFrame` de `@house/ui`, liseré rouge (`off`) si la box ou l'API ne répond pas, sinon `ok` ; seulement les appareils connectés, sans filtre.
- Carte de Home : le routeur du plan (décor `box`, `clickable`) : un clic ouvre l'onglet Box (`HouseMap`, `MapPlan/CLAUDE.md`). L'aperçu `BoxPreview` s'affiche si la sélection globale `box` de `lib/homeSelection.ts` est posée (aucun clic ne la pose aujourd'hui).
