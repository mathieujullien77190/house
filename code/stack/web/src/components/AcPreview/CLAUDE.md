# AcPreview – l'aperçu d'une clim sur la carte

Affiché par la carte de Home (`../HouseMap/CLAUDE.md`, règle d'aperçu commune) quand on choisit un split. Le double clic sur l'icône ouvre l'onglet Clim : pas de bouton d'ouverture.

- Même bloc que l'onglet Clim : `../AcPanel/AcUnitCard.tsx`.
- Bordure de 2 px : verte si allumée et joignable, rouge sinon, transparente tant que la clim est inconnue.
- Lecture et ordres : hook partagé `lib/useAcUnits.ts` (10 s, `setAc`, la réponse de l'API remplace l'unité).
