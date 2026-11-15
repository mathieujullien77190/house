export const BOX_CLASS = 'mt-6 flex flex-col gap-3'
export const FORM_CLASS = 'flex flex-col gap-3'
export const FIELDS_CLASS = 'grid grid-cols-1 gap-3 lg:grid-cols-4'
export const FIELD_CLASS = 'flex min-w-0 flex-col gap-1 text-[0.9rem]'
export const INPUT_CLASS = 'w-full min-w-0 rounded-lg border border-line bg-card px-3 py-1 text-fg [color-scheme:light] dark:[color-scheme:dark] focus-visible:outline-2 focus-visible:outline-accent max-lg:min-h-10'
export const HINT_CLASS = 'text-[0.8rem] text-muted'
export const ACTIONS_CLASS = 'flex flex-wrap items-center gap-3'
export const ERROR_CLASS = 'text-[0.9rem] text-danger'
/** Le type du champ `<input>` et son clavier sur téléphone. */
export const INPUT_TYPES = {
  number: { type: 'number', inputMode: 'numeric' },
  decimal: { type: 'text', inputMode: 'decimal' },
  time: { type: 'time', inputMode: undefined },
} as const
/** Version étroite (bloc de 320 px sur la carte de Home) : deux colonnes, libellés et aides plus petits, champs moins hauts. */
export const BOX_COMPACT_CLASS = 'mt-3 flex flex-col gap-2'
export const FIELDS_COMPACT_CLASS = 'grid grid-cols-2 gap-2'
export const FIELD_COMPACT_CLASS = 'flex min-w-0 flex-col gap-1 text-[0.72rem] leading-tight'
export const INPUT_COMPACT_CLASS = 'w-full min-w-0 rounded-lg border border-line bg-card px-2 py-0.5 text-[0.8rem] text-fg [color-scheme:light] dark:[color-scheme:dark] focus-visible:outline-2 focus-visible:outline-accent'
export const HINT_COMPACT_CLASS = 'text-[0.68rem] leading-tight text-muted'
/** Les champs numériques ont un « − » et un « + » de part et d'autre : le pas de chaque sorte (un entier de 1, un décimal de 0,5). */
export const STEPS = { number: 1, decimal: 0.5 } as const
export const STEP_LABELS = { less: 'Diminuer', more: 'Augmenter' } as const
export const STEP_SIGNS = { less: '−', more: '+' } as const
export const STEPPER_CLASS = 'flex items-stretch gap-1'
export const STEP_BUTTON_CLASS =
  'w-9 shrink-0 cursor-pointer rounded-lg border border-line bg-bg text-[1rem] leading-none text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent max-lg:min-h-10 max-lg:w-11'
export const STEP_BUTTON_COMPACT_CLASS =
  'w-6 shrink-0 cursor-pointer rounded-lg border border-line bg-bg text-[0.8rem] leading-none text-fg hover:border-accent focus-visible:outline-2 focus-visible:outline-accent'
