import { Collapsible } from '@house/ui'
import { ARROW_CLASS, ARROW_TEXT, INTRO_CLASS, LINK_CLASS, NODE_CLASS, NODE_DETAIL_CLASS, NODE_TITLE_CLASS, SECTION_CLASS, TIER_CLASS, TONE_CLASSES } from './constants'
import type { SchemaUIProps } from './types'

/** Les schémas, l'un après l'autre : des étages de boîtes reliés par des flèches qui disent ce qui passe. */
const SchemaUI = ({ diagrams }: SchemaUIProps) => (
  <>
    {diagrams.map((diagram) => (
      <Collapsible key={diagram.id} title={diagram.title}>
        <div className={SECTION_CLASS}>
          <p className={INTRO_CLASS}>{diagram.intro}</p>
          {diagram.tiers.map((tier) => (
            <div key={tier.id}>
              <div className={TIER_CLASS}>
                {tier.nodes.map((node) => (
                  <div key={node.id} className={`${NODE_CLASS} ${TONE_CLASSES[node.tone]}`}>
                    <span className={NODE_TITLE_CLASS}>{node.title}</span>
                    <span className={NODE_DETAIL_CLASS}>{node.detail}</span>
                  </div>
                ))}
              </div>
              {tier.link ? (
                <div className={LINK_CLASS}>
                  <span className={ARROW_CLASS} aria-hidden="true">
                    {ARROW_TEXT}
                  </span>
                  <span>{tier.link}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Collapsible>
    ))}
  </>
)

export default SchemaUI
