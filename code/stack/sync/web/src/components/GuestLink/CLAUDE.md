# GuestLink – le lien de la page invité

Dans le bloc « Page invité » de l'onglet Réglages (`../SettingsSection/CLAUDE.md`) : un **lien « Page invité ↗ »** (nouvel onglet, `rel="noopener noreferrer"` : le lien porte la clé) et un bouton **« Copier le lien »** (`navigator.clipboard`, « Lien copié ✓ » un instant, « Copie impossible » en cas d'échec).

- `info` vient de `guest_link` (`GET /api/guest`, `{key, port, url}`, construit à partir de `GUEST_KEY`, `GUEST_PORT` et `GUEST_PUBLIC_URL` du `.env` : `../../../../src/CLAUDE.md`). `SettingsSection` n'affiche rien quand `guest_link` est `null` (pas de `GUEST_KEY`).
- `helpers.ts` : `guestLink(info, host)` donne l'adresse publique `url` si elle existe, sinon `https://<hôte de House Sync>:<port>/`, avec `?k=<clé>`.
- Le rendu pur est dans `UI.tsx` ; `GuestLink.tsx` garde l'état de la copie.
