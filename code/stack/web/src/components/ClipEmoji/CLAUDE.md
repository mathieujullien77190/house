# ClipEmoji – l'emoji d'un clip

Rond en haut à droite du clip (vignette et lecteur, `../SavedClips/CLAUDE.md`) : l'emoji choisi ou « ＋ ».

- Un clic ouvre un champ d'**un seul symbole** (n'importe quel emoji, clavier du système). Un second symbole remplace le premier (`lastSymbol`, `helpers.ts` ; un emoji composé compte pour un).
- Entrée ou clic ailleurs enregistre, Échap annule, champ vide retire.
- `PUT /clips/<id>/emoji`, gardé par l'API dans `clip-emojis.json` ; elle refuse un texte qui n'est pas un emoji.
- L'emoji s'affiche ensuite sur la carte de Home (`../HouseMap/CLAUDE.md`).
