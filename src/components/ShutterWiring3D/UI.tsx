import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import {
  ARIA_LABEL,
  BUTTONS_CLASS,
  HINT,
  HOST_CLASS,
  INTRO,
  NAMES_LABEL,
  NO_WEBGL_TEXT,
  NOTE,
  POWER_LABEL,
  POWER_TITLE,
  RESET_LABEL,
  TITLE,
  TOP_LABEL,
  VIEW_HEIGHT,
  WARNING,
  WIRES_LABEL,
  WIRES_TITLE,
} from './constants'
import type { ShutterWiring3DUIProps } from './types'

const ShutterWiring3DUI = ({
  hostRef, supported, showNames, showWires, showPower, legend, powerSteps, onToggleNames, onToggleWires, onTogglePower, onResetView, onTopView,
}: ShutterWiring3DUIProps) => {
  return (
    <Card as="section">
      <h2 className="m-0 text-[1.15rem] font-semibold">{TITLE}</h2>
      <p className="mb-3 mt-0.5 text-[0.9rem] text-muted">{INTRO}</p>

      {!supported ? (
        <p className="m-0 text-muted">{NO_WEBGL_TEXT}</p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 min-[901px]:grid-cols-[1fr_300px]">
          <div>
            <div className={BUTTONS_CLASS}>
              <Button variant={showNames ? 'active' : 'default'} aria-pressed={showNames} onClick={onToggleNames}>
                {NAMES_LABEL}
              </Button>
              <Button variant={showWires ? 'active' : 'default'} aria-pressed={showWires} onClick={onToggleWires}>
                {WIRES_LABEL}
              </Button>
              <Button variant={showPower ? 'active' : 'default'} aria-pressed={showPower} onClick={onTogglePower}>
                {POWER_LABEL}
              </Button>
              <Button onClick={onTopView}>{TOP_LABEL}</Button>
              <Button onClick={onResetView}>{RESET_LABEL}</Button>
            </div>
            <div ref={hostRef} className={HOST_CLASS} style={{ height: VIEW_HEIGHT }} role="img" aria-label={ARIA_LABEL} />
            <p className="mb-0 mt-2 text-xs text-muted">{HINT}</p>
          </div>

          <div>
            <h3 className="m-0 mb-2 text-[0.95rem] font-semibold">{WIRES_TITLE}</h3>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {legend.map((item) => (
                <li key={item.id} className="grid grid-cols-[14px_1fr] items-start gap-2.5 border-b border-line pb-2 last:border-b-0">
                  <span className="mt-1 h-3.5 w-3.5 rounded-[3px] border border-line" style={{ backgroundColor: item.color }} />
                  <div>
                    <div className="font-mono text-[0.9rem]">{item.pair}</div>
                    <div className="text-[0.8rem] text-muted">{item.where}</div>
                  </div>
                </li>
              ))}
            </ol>
            <h3 className="m-0 mb-2 mt-4 text-[0.95rem] font-semibold">{POWER_TITLE}</h3>
            <ol className="m-0 list-decimal space-y-1 pl-5 text-[0.85rem]">
              {powerSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mb-0 mt-3 rounded-lg border border-backup px-3 py-2 text-[0.85rem]">{WARNING}</p>
            <p className="mb-0 mt-2 text-xs text-muted">{NOTE}</p>
          </div>
        </div>
      )}
    </Card>
  )
}

export default ShutterWiring3DUI
