export const BOX_CLASS = 'mt-6 flex flex-col gap-3'
export const FORM_CLASS = 'flex flex-col gap-3'
export const FIELDS_CLASS = 'grid grid-cols-1 gap-3 lg:grid-cols-4'
export const FIELD_CLASS = 'flex min-w-0 flex-col gap-1 text-[0.9rem]'
export const INPUT_CLASS = 'w-full min-w-0 rounded-lg border border-line bg-card px-3 py-1 text-fg focus-visible:outline-2 focus-visible:outline-accent max-lg:min-h-10'
export const HINT_CLASS = 'text-[0.8rem] text-muted'
export const ACTIONS_CLASS = 'flex flex-wrap items-center gap-3'
export const ERROR_CLASS = 'text-[0.9rem] text-danger'
export const STATUS_CLASS = 'text-[0.9rem]'
export const NOTE_CLASS = 'text-[0.8rem] text-muted'
export const LOG_TITLE_CLASS = 'mt-2 text-[1rem] font-semibold'
export const EMPTY_CLASS = 'text-[0.9rem] text-muted'
export const TOTAL_CLASS = 'text-right font-mono text-[0.9rem] font-semibold'
/** Le type du champ `<input>` et son clavier sur téléphone. */
export const INPUT_TYPES = {
  number: { type: 'number', inputMode: 'numeric' },
  decimal: { type: 'text', inputMode: 'decimal' },
  time: { type: 'time', inputMode: undefined },
} as const
