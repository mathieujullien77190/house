import type { Meta, StoryObj } from '@storybook/react-vite'
import { CameraCard, SnapshotImage, Timeline } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './CameraCard.en.md?raw'
import fr from './CameraCard.fr.md?raw'
import portailCode from './Portail.source.md?raw'
import phoneCode from './Phone.source.md?raw'

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
      name="voliere-exterieur"
      media={<SnapshotImage src="" message="Pas d’image gardée à cet instant." />}
      timeline={
        <Timeline
          ranges={[{ id: '1h', label: '1 h' }]}
          range="1h"
          live
          ticks={[{ x: 25, label: '15:15' }, { x: 50, label: '15:30' }, { x: 75, label: '15:45' }]}
          markers={[{ id: 'a', x: 70, width: 1.2, text: 'person · 15:43 · 15 s', selected: false, ongoing: false }]}
          coverage={[{ x: 0, width: 100 }]}
          cursorX={70}
          onRange={noop}
          onNow={noop}
          onSelect={noop}
        />
      }
    />
  ),
}

/** L'écran du téléphone est fixe sur toute la fenêtre : dans la page de docs il s'ouvre dans un cadre de 640 px. */
export const Phone: StoryObj<typeof CameraCard> = {
  parameters: { ...source(phoneCode), docs: { story: { inline: false, iframeHeight: 640 } } },
  render: () => (
    <CameraCard
      screen
      onBack={noop}
      backLabel="voliere-exterieur"
      name="voliere-exterieur"
      actions={<span>Léger · 4K</span>}
      details={<span>Température · 21,5 °C</span>}
      onExpand={noop}
      media={<SnapshotImage src="" message="Direct" />}
      timeline={
        <Timeline
          vertical
          fill
          ranges={[{ id: '1h', label: '1 h' }]}
          range="1h"
          live
          ticks={[{ x: 25, label: '15:15' }, { x: 50, label: '15:30' }, { x: 75, label: '15:45' }]}
          markers={[{ id: 'a', x: 70, width: 1.2, text: 'person · 15:43 · 15 s', selected: false, ongoing: false }]}
          coverage={[{ x: 0, width: 100 }]}
          cursorX={70}
          onRange={noop}
          onNow={noop}
          onSelect={noop}
        />
      }
    />
  ),
}
