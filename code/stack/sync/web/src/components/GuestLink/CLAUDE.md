# GuestLink – le lien de la page invité

Dans le bloc « Page invité » de l'onglet Réglages (`../SettingsSection/CLAUDE.md`) : lien « Page invité ↗ » et bouton « Copier le lien ».

- Le lien s'ouvre dans un nouvel onglet avec `rel="noopener noreferrer"` (il porte la clé).
- `info` vient de `guest_link` (`GET /api/guest`, `../../../../src/CLAUDE.md`). `SettingsSection` n'affiche rien s'il est `null`.
- `helpers.ts` : `guestLink(info, host)` donne `url` si elle existe, sinon `https://<hôte de House Sync>:<port>/`, avec `?k=<clé>`.
- `GuestLink.tsx` garde l'état de la copie (« Lien copié ✓ » un instant, « Copie impossible » sinon) ; rendu pur dans `UI.tsx`.
