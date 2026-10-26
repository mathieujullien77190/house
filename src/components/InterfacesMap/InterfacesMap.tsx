import InterfacesMapUI from './UI'
import { COLUMNS } from './constants'
import { layoutColumns } from './helpers'

// Le schéma est fixe : on pose ses pastilles une seule fois.
const LAYOUT = layoutColumns(COLUMNS)

/** Architecture des interfaces : les deux applications web, le paquet @house/ui, Storybook et House API. */
const InterfacesMap = () => {
  return <InterfacesMapUI layout={LAYOUT} />
}

export default InterfacesMap
