# guest/src – ce que montre la page invité

Rôle, accès, limites, journal : `../CLAUDE.md`. HTML pur avec un petit script (`SCRIPT` de `page.ts`), sans React.

- **Vignettes** : alignées, à la ligne, au plus **640 px** de large (largeur du flux léger, plus grand = flou). Mention « Cliquer pour passer en 4K ». Aucune caméra en grand au départ (pas de 4K pour rien).
- **Caméra en grand** : toucher une vignette l'ouvre **en 4K**, sans changer de page.
  - Ordinateur (1024 px et plus) : dans le bloc sous les vignettes ; la retoucher la referme.
  - Téléphone : plein écran paysage avec « ← Retour ». Le navigateur verrouille le paysage s'il peut, sinon l'image est tournée d'un quart de tour. Retour ou sortie du plein écran ferme le flux.
- **Attente** : « Chargement… » sur le noir jusqu'à la première image, avec le même rond que `SnapshotImage` de `@house/ui` (`.wait`, `.spin` repris, retirés au `load` ou `error`).
- **Zoom au doigt** (événements pointeur) : pincer à deux doigts (jusqu'à 6 fois), glisser à un doigt une fois zoomé, double toucher pour zoomer ou revenir. Remis à zéro à chaque ouverture. En plein écran tourné, les gestes sont ramenés dans le repère tourné.
- **Caméra posée de côté** : celles de `TURNED_CAMERAS` (`page.ts`, `voliere-exterieur`) sont tournées d'un quart de tour horaire comme dans la WebApp : vignette en portrait (360 px), image tournée, et sur téléphone elle **reste en portrait** (`.full.keep`). Les autres passent en paysage.
