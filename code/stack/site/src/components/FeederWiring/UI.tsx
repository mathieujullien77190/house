import Card from '@/components/UI/Card'
import {
  ARIA_LABEL,
  AVOID_TEXT,
  BOARD_LABEL,
  CAMERA_LABEL,
  CHARGER_AMPS,
  CHARGER_LABEL,
  CONFIRM_TEXT,
  INTRO,
  MINUS_COLOR,
  PINS_HEAD,
  PINS_TITLE,
  PIN_ROWS,
  PLUS_COLOR,
  POWER_STEPS,
  POWER_TITLE,
  SERVO_EMPTY_LABEL,
  SERVO_FILL_LABEL,
  SERVO_WIRES_LABEL,
  SIGNAL_COLOR,
  STATE_TEXT,
  TITLE,
  WIRES,
} from './constants'

const WIRE_WIDTH = 3
const PIN_TEXT = 'fill-fg text-[11px] font-mono'
const SERVOS = [
  { id: 'fill', y: 70, label: SERVO_FILL_LABEL },
  { id: 'empty', y: 194, label: SERVO_EMPTY_LABEL },
]

const FeederWiringUI = () => (
  <Card as="section">
    <h2 className="m-0 text-[1.15rem] font-semibold">{TITLE}</h2>
    <p className="mb-1 mt-0.5 text-[0.9rem] text-muted">{INTRO}</p>
    <p className="mb-3 mt-0 text-[0.8rem] text-muted">{STATE_TEXT}</p>

    <div className="grid grid-cols-1 items-start gap-4 min-[901px]:grid-cols-[1fr_320px]">
      <svg viewBox="0 0 760 450" className="w-full rounded-lg border border-line bg-bg" role="img" aria-label={ARIA_LABEL}>
        {/* Les fils sous les pièces. */}
        {WIRES.map((wire) => (
          <polyline key={wire.id} points={wire.points} fill="none" stroke={wire.color} strokeWidth={WIRE_WIDTH} strokeLinejoin="round" strokeLinecap="round">
            <title>{wire.label}</title>
          </polyline>
        ))}

        {/* La carte : l'objectif en haut, la prise USB-C en bas. */}
        <rect x="190" y="30" width="200" height="345" rx="10" className="fill-card stroke-fg" strokeWidth="2" />
        <text x="290" y="58" textAnchor="middle" className="fill-fg text-[13px] font-semibold">
          {BOARD_LABEL}
        </text>
        <circle cx="290" cy="105" r="20" className="fill-bg stroke-fg" strokeWidth="2" />
        <circle cx="290" cy="105" r="9" className="fill-fg" />
        <text x="290" y="145" textAnchor="middle" className="fill-muted text-[11px]">
          {CAMERA_LABEL}
        </text>
        <rect x="258" y="360" width="64" height="15" rx="4" className="fill-bg stroke-fg" strokeWidth="1.5" />
        <text x="290" y="352" textAnchor="middle" className="fill-muted text-[11px]">
          USB-C
        </text>

        {/* Les broches utilisées. */}
        <circle cx="390" cy="90" r="5" fill={SIGNAL_COLOR} />
        <text x="378" y="94" textAnchor="end" className={PIN_TEXT}>
          GPIO 1
        </text>
        <circle cx="390" cy="114" r="5" fill={SIGNAL_COLOR} />
        <text x="378" y="118" textAnchor="end" className={PIN_TEXT}>
          GPIO 2
        </text>
        <circle cx="190" cy="345" r="5" fill={PLUS_COLOR} />
        <text x="202" y="349" className={PIN_TEXT}>
          5V
        </text>
        <circle cx="390" cy="345" r="5" fill={MINUS_COLOR} />
        <text x="378" y="349" textAnchor="end" className={PIN_TEXT}>
          GND
        </text>

        {/* Le chargeur. */}
        <rect x="20" y="390" width="150" height="50" rx="8" className="fill-card stroke-fg" strokeWidth="2" />
        <text x="95" y="412" textAnchor="middle" className="fill-fg text-[12px] font-semibold">
          {CHARGER_LABEL}
        </text>
        <text x="95" y="428" textAnchor="middle" className="fill-muted text-[11px]">
          {CHARGER_AMPS}
        </text>

        {/* Les deux servos : trois fils chacun, sur leur côté gauche. */}
        {SERVOS.map((servo) => (
          <g key={servo.id}>
            <rect x="560" y={servo.y} width="150" height="80" rx="8" className="fill-card stroke-fg" strokeWidth="2" />
            <text x="635" y={servo.y + 50} textAnchor="middle" className="fill-fg text-[12px] font-semibold">
              {servo.label}
            </text>
            <circle cx="560" cy={servo.y + 30} r="4" fill={SIGNAL_COLOR} />
            <circle cx="560" cy={servo.y + 40} r="4" fill={PLUS_COLOR} />
            <circle cx="560" cy={servo.y + 50} r="4" fill={MINUS_COLOR} />
          </g>
        ))}
        <text x="570" y="62" className="fill-muted text-[10px]">
          {SERVO_WIRES_LABEL}
        </text>
      </svg>

      <div>
        <h3 className="m-0 mb-2 text-[0.95rem] font-semibold">{PINS_TITLE}</h3>
        <table className="w-full border-collapse text-[0.85rem]">
          <thead>
            <tr>
              <th className="border-b border-line px-2 py-1 text-left">{PINS_HEAD.signal}</th>
              <th className="border-b border-line px-2 py-1 text-left">{PINS_HEAD.pin}</th>
            </tr>
          </thead>
          <tbody>
            {PIN_ROWS.map((row) => (
              <tr key={row.id}>
                <td className="border-b border-line px-2 py-1.5 align-top">
                  {row.signal}
                  <small className="block text-xs text-muted">{row.note}</small>
                </td>
                <td className="border-b border-line px-2 py-1.5 align-top font-mono">{row.pin}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mb-0 mt-2 text-xs text-muted">{AVOID_TEXT}</p>
        <p className="mb-0 mt-1 text-xs text-muted">{CONFIRM_TEXT}</p>
        <h3 className="m-0 mb-2 mt-4 text-[0.95rem] font-semibold">{POWER_TITLE}</h3>
        <ol className="m-0 list-decimal space-y-1 pl-5 text-[0.85rem]">
          {POWER_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  </Card>
)

export default FeederWiringUI
