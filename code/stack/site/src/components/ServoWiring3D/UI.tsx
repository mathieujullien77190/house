import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import {
  ARIA_LABEL,
  BUTTONS_CLASS,
  ESP_TITLE,
  HINT,
  HOST_CLASS,
  INTRO,
  LINK_CLASS,
  MINUS_CSS,
  NAMES_LABEL,
  NO_WEBGL_TEXT,
  NOTE,
  NUM_CLASS,
  PLUS_CSS,
  POWER_LABEL,
  POWER_TITLE,
  PURCHASES_HEAD,
  PURCHASES_INTRO,
  PURCHASES_TITLE,
  PURCHASES_TOTAL_LABEL,
  RESET_LABEL,
  SERVOS_TITLE,
  TD_CLASS,
  TH_CLASS,
  TITLE,
  TOP_LABEL,
  VIEW_HEIGHT,
  WARNING,
  WIRES_LABEL,
} from './constants'
import type { ServoWiring3DUIProps } from './types'

const ServoWiring3DUI = ({
  hostRef, supported, showNames, showWires, showPower, legend, servoLegend, powerSteps, purchases, purchasesTotal, onToggleNames, onToggleWires, onTogglePower, onResetView, onTopView,
}: ServoWiring3DUIProps) => {
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
            <h3 className="m-0 mb-2 text-[0.95rem] font-semibold">{ESP_TITLE}</h3>
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
            <h3 className="m-0 mb-2 mt-4 text-[0.95rem] font-semibold">{SERVOS_TITLE}</h3>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {servoLegend.map((item) => (
                <li key={item.id} className="grid grid-cols-[46px_1fr] items-start gap-2.5 border-b border-line pb-2 last:border-b-0">
                  <span className="mt-1 flex gap-0.5">
                    <span className="h-3.5 w-3.5 rounded-[3px] border border-line" style={{ backgroundColor: MINUS_CSS }} />
                    <span className="h-3.5 w-3.5 rounded-[3px] border border-line" style={{ backgroundColor: PLUS_CSS }} />
                    <span className="h-3.5 w-3.5 rounded-[3px] border border-line" style={{ backgroundColor: item.color }} />
                  </span>
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

      <h3 className="m-0 mb-1 mt-5 text-[1rem] font-semibold">{PURCHASES_TITLE}</h3>
      <p className="mb-2 mt-0 text-[0.85rem] text-muted">{PURCHASES_INTRO}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr>
              <th className={TH_CLASS}>{PURCHASES_HEAD.part}</th>
              <th className={`${TH_CLASS} ${NUM_CLASS}`}>{PURCHASES_HEAD.price}</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((item) => (
              <tr key={item.id}>
                <td className={TD_CLASS}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className={LINK_CLASS}>
                      {item.label}
                    </a>
                  ) : (
                    item.label
                  )}
                  <small className="block text-xs text-muted">{item.note}</small>
                </td>
                <td className={`${TD_CLASS} ${NUM_CLASS}`}>{item.price}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="px-2.5 py-1.5 text-left text-base">{PURCHASES_TOTAL_LABEL}</th>
              <th className={`px-2.5 py-1.5 text-base ${NUM_CLASS}`}>{purchasesTotal}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

export default ServoWiring3DUI
