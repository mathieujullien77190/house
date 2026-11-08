# TableSection – une table de la base

Une table de `events.db`, **repliée par défaut, toutes les tables** (le titre déplie ; la page n'est chargée qu'une fois dépliée), paginée (20 lignes), avec ses filtres et une description par table dans `constants.ts` (`DESCRIPTIONS`).

- **Filtres** (`TableFilters` de `@house/ui`, une requête refaite à chaque choix, `lib/filter.ts`) : caméra et date pour `events`, `snapshots`, `merges` ; nom du matériel et date pour `hue_events` ; clé (avec clé, sans clé, clé fausse) et date pour `guest_visits`. La table `plan` (le plan de la maison : arbres, haies, cage, caméras du plan…, `longitude`, `latitude`, rayons et décalages en mètres, angles en degrés, dans `data`) est visible sans filtre.
- Les horodatages sont sur deux lignes (`StackedDate`). Le rendu des cellules est dans `UI.tsx` : clip ou image → bouton « voir », adresse → lien, horodatage → date, étiquette → pastille, adresse IP → en une ligne, jamais coupée.
- **`guest_visits` n'affiche que ses colonnes principales** (`MAIN_COLUMNS`, dans cet ordre : `id`, `started_at`, `ip`, `origin`, `cle` (avec clé / sans clé / clé fausse), `camera`, `status`, `path`) et **le reste au clic sur la ligne** (le détail sous la ligne : fin, type, navigateur, qualité, durée, octets, langue, hôte, User-Agent), grâce aux lignes dépliables du `DataTable` de `@house/ui`.
