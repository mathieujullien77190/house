# MapPlan – le repère du plan de la maison

Il n'y a **plus de carte** (la Home montre la vue 3D, `../Kitchen3D/CLAUDE.md`). Ce dossier ne garde que le repère du plan, encore lu par `lib/usePlan.ts`, `lib/planCoords.ts`, `Lights/helpers.ts` et la vue 3D. Types du plan (`PlanHedge`…) dans `@house/ui` (`ui/src/plan.ts`).

- `constants.ts` : `MAP_CENTER` (l'**origine du plan**, le centre du bâti au cadastre : ne doit pas bouger), `MAP_ANCHOR`, `MAP_UNITS_PER_METER` (43,5 unités par mètre : bâti de 12,4 m sur 7,65 m, parcelle AO 0018), `MAP_HOUSE_HEIGHT`, `MAP_ROTATION_DEG` (37,7°).
- `projection.ts` : du plan (unités) aux longitude et latitude, et retour.
- `helpers.ts` : `fromHousePlan` (un point de l'ancien plan des lumières, 540 × 300, en point du plan).
- `parcel.ts`, `ring.ts` : contour du cadastre (API Carto IGN) et haies de départ (`PARCEL_HEDGES`), percées aux portails.

## Où le plan est gardé

- **Par House API seule** (`lib/usePlan.ts`) : lu une fois (`GET /plan`), chaque changement part en `PUT /plan` 500 ms plus tard (House Sync l'importe dans la table `plan`). Rien n'est envoyé tant que le plan n'est pas lu. Plus rien dans la WebApp ne modifie le plan (les fonctions de `usePlan` qui le font restent, sans appelant).
- **Vraies coordonnées** (`lib/planCoords.ts`) : longitude / latitude, mètres, caps (version 2 : `../../../../api/src/routes/CLAUDE.md`). Un plan en unités est converti puis renvoyé en version 2.
