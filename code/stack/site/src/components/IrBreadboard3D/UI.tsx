import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import { ARIA_LABEL, BUTTONS_CLASS, HINT, HOST_CLASS, INTRO, NAMES_LABEL, NO_WEBGL_TEXT, PARTS_TITLE, RESET_LABEL, STEPS_TITLE, TEST_TEXT, TITLE, TOP_LABEL, VIEW_HEIGHT, WARNING, WIRES_LABEL } from './constants'
import type { IrBreadboard3DUIProps } from './types'

const IrBreadboard3DUI = ({ hostRef, supported, showNames, showWires, steps, parts, onToggleNames, onToggleWires, onResetView, onTopView }: IrBreadboard3DUIProps) => {
  return (
    <Card as="section">
      <h2 className="m-0 text-[1.15rem] font-semibold">{TITLE}</h2>
      <p className="mb-3 mt-0.5 text-[0.9rem] text-muted">{INTRO}</p>

      {!supported ? (
        <p className="m-0 text-muted">{NO_WEBGL_TEXT}</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 min-[901px]:grid-cols-[1fr_340px]">
          <div>
            <div className={BUTTONS_CLASS}>
              <Button variant={showNames ? 'active' : 'default'} aria-pressed={showNames} onClick={onToggleNames}>
                {NAMES_LABEL}
              </Button>
              <Button variant={showWires ? 'active' : 'default'} aria-pressed={showWires} onClick={onToggleWires}>
                {WIRES_LABEL}
              </Button>
              <Button onClick={onTopView}>{TOP_LABEL}</Button>
              <Button onClick={onResetView}>{RESET_LABEL}</Button>
            </div>
            <div ref={hostRef} className={HOST_CLASS} style={{ height: VIEW_HEIGHT }} role="img" aria-label={ARIA_LABEL} />
            <p className="mb-0 mt-2 text-xs text-muted">{HINT}</p>
          </div>

          <div>
            <h3 className="m-0 mb-2 text-[0.95rem] font-semibold">{PARTS_TITLE}</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {parts.map((part) => (
                <li key={part.id} className="border-b border-line pb-2 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{part.name}</span>
                    {part.value ? <span className="font-mono text-[0.9rem]">{part.value}</span> : null}
                    {part.bands ? (
                      <span className="ml-auto flex h-3.5 items-center gap-0.5 rounded-full border border-line bg-[#8fc7e8] px-1.5" aria-hidden="true">
                        {part.bands.map((color, index) => (
                          <span key={`${part.id}-${index}`} className="h-full w-1" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[0.8rem] text-muted">{part.note}</div>
                </li>
              ))}
            </ul>
            <h3 className="m-0 mb-2 mt-4 text-[0.95rem] font-semibold">{STEPS_TITLE}</h3>
            <ol className="m-0 list-decimal space-y-1.5 pl-5 text-[0.85rem]">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mb-0 mt-3 rounded-lg border border-backup px-3 py-2 text-[0.85rem]">{WARNING}</p>
            <p className="mb-0 mt-2 text-xs text-muted">{TEST_TEXT}</p>
          </div>
        </div>
      )}
    </Card>
  )
}

export default IrBreadboard3DUI
