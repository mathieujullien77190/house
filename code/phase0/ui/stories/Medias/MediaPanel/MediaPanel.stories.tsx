import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, MediaPanel } from '../../../src'
import { boxed } from '../../decorators'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './MediaPanel.en.md?raw'
import fr from './MediaPanel.fr.md?raw'
import clipCode from './Clip.source.md?raw'

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

/** Le panneau s'ouvre sur un clic et se ferme par son bouton ; la vidéo démarre seule. */
const Clip = () => {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Button onClick={() => setOpen(true)}>voir</Button>
      {open ? <MediaPanel kind="video" title="clips/portail/1792941234.588848-jlzqs5.mp4" src={SAMPLE_VIDEO} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

const meta: Meta<typeof MediaPanel> = {
  title: 'Médias/MediaPanel',
  component: MediaPanel,
  decorators: [boxed],
  parameters: prose({ fr, en }),
}

export default meta

export const ClipStory: StoryObj<typeof MediaPanel> = {
  name: 'Clip',
  parameters: source(clipCode),
  render: () => <Clip />,
}
