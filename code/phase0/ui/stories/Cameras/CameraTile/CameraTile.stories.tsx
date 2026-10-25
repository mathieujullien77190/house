import type { Meta, StoryObj } from '@storybook/react-vite'
import { CameraTile, SnapshotImage } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './CameraTile.en.md?raw'
import fr from './CameraTile.fr.md?raw'
import mosaicCode from './Mosaic.source.md?raw'

const meta: Meta<typeof CameraTile> = {
  title: 'Caméras/CameraTile',
  component: CameraTile,
  parameters: prose({ fr, en }),
}

export default meta

export const Mosaic: StoryObj<typeof CameraTile> = {
  parameters: source(mosaicCode),
  render: () => (
    <div className="grid max-w-[720px] gap-3 sm:grid-cols-2">
      <CameraTile name="Caméra : portail" media={<SnapshotImage src="" message="Direct" />} caption="En marche · 3,3 W" onOpen={() => undefined} />
      <CameraTile name="Caméra : camera2" media={<SnapshotImage src="" message="Caméra éteinte" />} caption="Éteinte (PoE coupé)" onOpen={() => undefined} />
    </div>
  ),
}
