import { D } from '@/lib/drawing'
import { ARIA_LABEL, IR_LED_RADIUS, VIEW_BOX } from './constants'
import type { ReolinkDrawingUIProps } from './types'

const ReolinkDrawingUI = ({ irLeds }: ReolinkDrawingUIProps) => {
  return (
    <svg viewBox={VIEW_BOX} className={D.svg} role="img" aria-label={ARIA_LABEL}>
      {/* support mural */}
      <rect x="60" y="40" width="26" height="220" rx="4" className={D.part} />
      <rect x="86" y="140" width="70" height="18" className={D.part} />
      <circle cx="170" cy="149" r="14" className={D.part} />
      {/* corps */}
      <path d="M 170 100 H 380 Q 400 100 400 120 V 178 Q 400 198 380 198 H 170 Z" className={D.body} />
      {/* parasoleil */}
      <path d="M 380 92 H 470 L 478 104 V 194 L 470 206 H 380 Z" className={D.body} />
      {/* objectif */}
      <ellipse cx="478" cy="149" rx="14" ry="45" className={D.lens} />
      <ellipse cx="478" cy="149" rx="6" ry="20" className={D.glass} />
      {/* LED infrarouges */}
      {irLeds.map((led) => (
        <circle key={led.cy} cx={led.cx} cy={led.cy} r={IR_LED_RADIUS} className={D.led} />
      ))}
      {/* câble RJ45 */}
      <path d="M 170 149 C 130 149, 120 220, 90 250 S 60 285, 20 285" className={D.cable} />
      <rect x="2" y="276" width="24" height="18" rx="3" className={D.part} />

      <text x="420" y="70" className={D.label}>Objectif + LED infrarouges</text>
      <line x1="470" y1="76" x2="478" y2="104" className={D.leader} />
      <text x="230" y="80" className={D.label}>Corps étanche IP66</text>
      <line x1="270" y1="86" x2="270" y2="100" className={D.leader} />
      <text x="100" y="125" className={D.label}>Support mural</text>
      <text x="100" y="284" className={D.label}>Câble RJ45 PoE</text>
      <text x="170" y="250" className={D.label}>données + alimentation par un seul câble</text>
    </svg>
  )
}

export default ReolinkDrawingUI
