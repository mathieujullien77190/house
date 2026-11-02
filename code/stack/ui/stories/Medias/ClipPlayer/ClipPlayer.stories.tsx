import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ClipPlayer } from '../../../src'
import { prose } from '../../i18n'
import { source } from '../../source'
import en from './ClipPlayer.en.md?raw'
import fr from './ClipPlayer.fr.md?raw'
import followCode from './Follow.source.md?raw'
import loadingCode from './Loading.source.md?raw'

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

/** Le lecteur démarre à 3 s et remonte sa position : la story l'affiche dessous. */
const Follow = () => {
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  return (
    <div className="max-w-[720px]">
      <ClipPlayer src={SAMPLE_VIDEO} error="" startAt={3} onClose={() => undefined} onTime={setTime} onDuration={setDuration} />
      <p className="mt-2 text-[0.85rem] text-muted">
        position {time.toFixed(1)} s · durée {duration.toFixed(1)} s
      </p>
    </div>
  )
}

const meta: Meta<typeof ClipPlayer> = {
  title: 'Médias/ClipPlayer',
  component: ClipPlayer,
  parameters: prose({ fr, en }),
}

export default meta

export const FollowStory: StoryObj<typeof ClipPlayer> = {
  name: 'Follow',
  parameters: source(followCode),
  render: () => <Follow />,
}

export const Loading: StoryObj<typeof ClipPlayer> = {
  parameters: source(loadingCode),
  render: () => (
    <div className="max-w-[720px]">
      <ClipPlayer src="" error="" startAt={0} onClose={() => undefined} onTime={() => undefined} onDuration={() => undefined} />
    </div>
  ),
}
