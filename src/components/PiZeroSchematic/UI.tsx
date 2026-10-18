import { D } from '@/lib/drawing'
import { VIEW_BOX } from './constants'
import type { PiZeroSchematicUIProps } from './types'

const PiZeroSchematicUI = ({ ariaLabel }: PiZeroSchematicUIProps) => {
  return (
    <svg viewBox={VIEW_BOX} className={D.svg} role="img" aria-label={ariaLabel}>
      {/* Switch PoE */}
      <rect x="10" y="140" width="110" height="110" rx="8" className={D.part} />
      <text x="65" y="175" textAnchor="middle" className={D.title}>Switch PoE</text>
      <text x="65" y="193" textAnchor="middle" className={D.note}>802.3af</text>
      <text x="65" y="209" textAnchor="middle" className={D.note}>données + 48 V</text>

      {/* câble unique */}
      <line x1="120" y1="195" x2="165" y2="195" className={D.cable} />
      <text x="142" y="185" textAnchor="middle" className={D.note}>RJ45</text>

      {/* Splitter PoE */}
      <rect x="165" y="130" width="130" height="130" rx="8" className={D.part} />
      <text x="230" y="158" textAnchor="middle" className={D.title}>Splitter PoE</text>
      <text x="230" y="175" textAnchor="middle" className={D.note}>sépare courant</text>
      <text x="230" y="190" textAnchor="middle" className={D.note}>et données</text>
      <text x="295" y="165" textAnchor="end" className={D.note}>5 V 2 A</text>
      <text x="295" y="235" textAnchor="end" className={D.note}>RJ45 données</text>

      {/* alimentation → PWR */}
      <path d="M 295 170 H 390 V 195" className={D.wirePower} />
      {/* données → adaptateur Ethernet */}
      <line x1="295" y1="228" x2="335" y2="228" className={D.cable} />
      <rect x="335" y="205" width="85" height="45" rx="6" className={D.part} />
      <text x="377" y="224" textAnchor="middle" className={D.title}>Adaptateur</text>
      <text x="377" y="240" textAnchor="middle" className={D.note}>Ethernet USB-OTG</text>
      <line x1="420" y1="228" x2="455" y2="228" className={D.wireData} />

      {/* Pi Zero 2 W */}
      <rect x="390" y="90" width="220" height="190" rx="8" className={D.board} />
      <text x="500" y="115" textAnchor="middle" className={D.title}>Pi Zero 2 W</text>
      <rect x="383" y="188" width="14" height="18" className={D.part} />
      <text x="403" y="201" className={D.pinLabel}>PWR</text>
      <rect x="448" y="220" width="14" height="18" className={D.part} />
      <text x="470" y="233" className={D.pinLabel}>USB (données)</text>
      <rect x="470" y="84" width="60" height="12" className={D.part} />
      <text x="500" y="135" textAnchor="middle" className={D.pinLabel}>CSI 22 broches</text>
      <rect x="470" y="262" width="70" height="18" rx="2" className={D.part} />
      <text x="505" y="257" textAnchor="middle" className={D.pinLabel}>microSD</text>
      <circle cx="610" cy="245" r="4" className={D.pin} />
      <text x="600" y="249" textAnchor="end" className={D.pinLabel}>GPIO17</text>
      <text x="500" y="175" textAnchor="middle" className={D.note}>Wi-Fi désactivé</text>

      {/* Camera Module 3 NoIR */}
      <rect x="660" y="20" width="100" height="75" rx="6" className={D.part} />
      <circle cx="710" cy="52" r="18" className={D.lens} />
      <circle cx="710" cy="52" r="8" className={D.glass} />
      <text x="710" y="114" textAnchor="middle" className={D.title}>Camera Module 3 NoIR</text>
      <text x="710" y="130" textAnchor="middle" className={D.note}>25 × 24 mm, 75°</text>
      <path d="M 500 84 C 500 40, 600 40, 660 60" className={D.cable} />
      <text x="580" y="34" textAnchor="middle" className={D.note}>nappe 22 → 15 broches</text>

      {/* Projecteur IR (option) */}
      <rect x="640" y="300" width="130" height="75" rx="8" className={D.partDashed} />
      <text x="705" y="326" textAnchor="middle" className={D.title}>Projecteur IR 850 nm</text>
      <text x="705" y="343" textAnchor="middle" className={D.note}>MOSFET + LED (option)</text>
      <text x="705" y="359" textAnchor="middle" className={D.note}>nuit : caméra NoIR</text>
      <path d="M 610 245 C 610 300, 620 335, 640 335" className={D.wireData} />
      <path d="M 230 260 V 405 H 705 V 375" className={D.wirePowerDashed} />
      <text x="420" y="398" className={D.note}>5 V du splitter</text>

      <text x="10" y="300" className={D.note}>Un seul câble RJ45 vers le switch :</text>
      <text x="10" y="316" className={D.note}>courant et vidéo (RTSP) passent par le même câble.</text>
    </svg>
  )
}

export default PiZeroSchematicUI
