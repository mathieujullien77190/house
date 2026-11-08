import { VIEWS } from './constants'
import SchemaUI from './UI'

/** L'onglet Schéma : l'architecture matérielle, puis l'architecture logicielle, à la suite. Les mêmes schémas que l'onglet Architecture du site ; rien à charger. */
const SchemaSection = () => <SchemaUI views={VIEWS} />

export default SchemaSection
