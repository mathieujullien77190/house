import type { MainsItem } from './types'

export const TITLE = 'Branchements secteur 230 V'
export const NOTE =
  'Les caméras PoE sont alimentées par les switchs : leur consommation est comprise dans le budget PoE. Puissances maximales estimées.'

/** L'onduleur se branche sur le secteur et alimente les switchs et les Pi5. */
export const UPS_ITEM: MainsItem = {
  id: 'ups',
  label: 'Onduleur',
  detail: 'protège les switchs et les Pi5',
  watts: null,
}

export const DETAIL_BY_KIND: Record<string, string> = {
  switch: 'budget PoE des caméras compris',
  pi: 'alimentation officielle 27 W USB-C',
  backup: 'alimentation officielle 27 W USB-C',
}
