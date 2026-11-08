import { Collapsible } from '@house/ui'
import ArchDiagram from './ArchDiagram'
import { INTRO_CLASS, PARAGRAPH_CLASS } from './constants'
import type { SchemaUIProps } from './types'

/** Les schémas, l'un après l'autre : un bloc repliable chacun, son texte d'introduction puis le dessin. */
const SchemaUI = ({ views }: SchemaUIProps) => (
  <>
    {views.map(({ title, view }) => (
      <Collapsible key={view.id} title={title}>
        <div className={INTRO_CLASS}>
          {view.intro.map((paragraph) => (
            <p key={paragraph} className={PARAGRAPH_CLASS}>
              {paragraph}
            </p>
          ))}
        </div>
        <ArchDiagram view={view} />
      </Collapsible>
    ))}
  </>
)

export default SchemaUI
