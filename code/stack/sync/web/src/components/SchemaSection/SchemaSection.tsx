import { DIAGRAMS } from './constants'
import SchemaUI from './UI'

/** L'onglet Schéma : l'architecture matérielle, puis l'architecture logicielle, à la suite. Rien à charger : le contenu est écrit dans `constants.ts`. */
const SchemaSection = () => <SchemaUI diagrams={DIAGRAMS} />

export default SchemaSection
