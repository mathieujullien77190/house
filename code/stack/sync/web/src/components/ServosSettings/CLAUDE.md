# ServosSettings – le bloc « Volets à servos »

Contenu du bloc repliable « Volets à servos » de l'onglet Réglages (`../SettingsSection/CLAUDE.md`).

- Champs : adresse de l'ESP32 des servos (défaut `http://192.168.1.115`) puis trois sous-blocs repliables (`SHUTTERS` : **Salon** n° 2, **PC** n° 5, **Porte** n° 6) avec, pour **Monter**, **Descendre** et **Stop** : canal (0-15), départ (°), arrivée (°), vitesse (°/s, 0 = max), attente (s).
- Un champ est enregistré en le quittant (ou Entrée), seul (`PUT /api/servos` avec `{shutters: {<volet>: {<ordre>: {<champ>: n}}}}` ou `{url}`). Texte vide, non numérique ou inchangé : rien n'est envoyé. Valeur refusée par House Sync (400) : message d'erreur et le champ revient à la valeur gardée.
- **Tester** : un bouton par ordre, **en bout de ligne**, suivi de **Origine** (même route avec `origin: true` : met le servo à 0° à la vitesse réglée, sans séquence) ; après les cinq champs (`POST /api/servos/test` `{shutter, command}`) joue la séquence avec les réglages **enregistrés** (un champ en cours de saisie l'est en le quittant, donc avant le clic). Bouton grisé pendant l'appel ; si l'ESP32 ne répond pas (502), un message s'affiche sous le bouton.
- `helpers.ts` : `patchOf` (le corps à envoyer pour un champ). Rendu pur dans `UI.tsx`.
- Validation et fichier (`servos.json`, relu par House API à chaque ordre) : `../../../../src/CLAUDE.md` (« Volets à servos »).
