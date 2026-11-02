import type { Meta, StoryObj } from '@storybook/react-vite'
import { CameraCard, SnapshotImage, Timeline } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './CameraCard.en.md?raw'
import fr from './CameraCard.fr.md?raw'
import portailCode from './Portail.source.md?raw'

const noop = () => undefined

const meta: Meta<typeof CameraCard> = {
  title: 'Caméras/CameraCard',
  component: CameraCard,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const Portail: StoryObj<typeof CameraCard> = {
  parameters: source(portailCode),
  render: () => (
    <CameraCard
      name="portail"
      caption="Image à 25/10/2026 15:43"
      media={<SnapshotImage src="" message="Pas d’image gardée à cet instant." />}
      timeline={
        <Timeline
          ranges={[{ id: '1h', label: '1 h' }]}
          range="1h"
          live
          windowText="25/10/2026 15:00 → 25/10/2026 16:00 · 1 h"
          ticks={[{ x: 25, label: '15:15' }, { x: 50, label: '15:30' }, { x: 75, label: '15:45' }]}
          markers={[{ id: 'a', x: 70, width: 1.2, text: 'person · 15:43 · 15 s', selected: false, ongoing: false }]}
          coverage={[{ x: 0, width: 100 }]}
          cursorX={70}
          older={0}
          onRange={noop}
          onNow={noop}
          onSelect={noop}
        />
      }
    />
  ),
}
