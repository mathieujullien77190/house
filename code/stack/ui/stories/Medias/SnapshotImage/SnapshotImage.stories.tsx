import type { Meta, StoryObj } from '@storybook/react-vite'
import { SnapshotImage } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './SnapshotImage.en.md?raw'
import fr from './SnapshotImage.fr.md?raw'
import labelledCode from './Labelled.source.md?raw'
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

export const Labelled: StoryObj<typeof SnapshotImage> = {
  parameters: source(labelledCode),
  render: () => (
    <div className="max-w-[720px]">
      <SnapshotImage src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" label="Image 1793866328" message="Pas d’image." />
    </div>
  ),
}
