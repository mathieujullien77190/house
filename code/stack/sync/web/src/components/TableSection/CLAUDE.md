# TableSection – une table de la base

Une table de `events.db`, **repliée par défaut** (la page ne se charge qu'une fois dépliée), paginée (20 lignes). Descriptions dans `constants.ts` (`DESCRIPTIONS`).

## Filtres

`TableFilters` de `@house/ui`, requête refaite à chaque choix (`lib/filter.ts`).

- `events`, `snapshots`, `merges` : caméra et date.
- `hue_events` : nom du matériel et date.
- `guest_visits` : clé (avec, sans, fausse) et date.
- `heating_log`, `plan` : pas de filtre (`heating_log` : date seule).

## Cas particuliers

- **`heating_log`** : l'en-tête montre les sommes (temps activé, coût : « activé 2 h 05 · 0,53 € », `sumsText` de `helpers.ts`). Dépliée : celles du filtre ; repliée : celles de toute la table (`sums` de `GET /api/tables`, calculé par `sumsOf` de `sync/src/data.ts`).
- **`guest_visits`** : colonnes principales seulement (`MAIN_COLUMNS` : `id`, `started_at`, `ip`, `origin`, `cle`, `camera`, `status`, `path`) ; le reste au clic sur la ligne (lignes dépliables de `DataTable`).
- `heating_log`, `camera_energy`, `lamp_energy` n'ont pas de description.

## Rendu des cellules (`UI.tsx`)

- Horodatage : deux lignes (`StackedDate`).
- Clip ou image : bouton « voir » ; adresse : lien ; étiquette : pastille ; adresse IP : une ligne, jamais coupée.
