# ShutterPreview – l'aperçu d'un volet sur la carte

Affiché par la carte de Home (`../HouseMap/CLAUDE.md`, règle d'aperçu commune) quand on choisit un volet. **Un clic ne donne pas d'ordre** : les ordres se donnent dans le bloc.

- Même bloc que l'onglet Volet : `../ShuttersPanel/ShutterCard.tsx` (Monter, Stop, Descendre, « Fermer à moitié », dernier ordre, cases automatiques).
- Bordure de 2 px : bleu pâle `#8fd0f7` si ouvert, violet `#8b5cf6` si le dernier ordre était « descendre ».
- Lecture et ordres : hook partagé `lib/useShutters.ts` (10 s, 2 s pendant « Fermer à moitié »). La réponse de l'API s'affiche tout de suite après un ordre.
