import type { Meta, StoryObj } from '@storybook/react-vite'
import { SnapshotImage } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './SnapshotImage.en.md?raw'
import fr from './SnapshotImage.fr.md?raw'
import missingCode from './Missing.source.md?raw'

const meta: Meta<typeof SnapshotImage> = {
  title: 'Médias/SnapshotImage',
  component: SnapshotImage,
  parameters: prose({ fr, en }),
}

export default meta

export const Missing: StoryObj<typeof SnapshotImage> = {
  parameters: source(missingCode),
  render: () => (
    <div className="max-w-[720px]">
      <SnapshotImage src="" message="Pas d’image gardée à cet instant (une par minute, quelques jours)." />
    </div>
  ),
}
