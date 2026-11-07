import { Button, CameraTile, Notice, SectionTitle } from '@house/ui'
import ClipPlayer from '@/components/ClipPlayer'
import ShareButton from '@/components/ShareButton'
import { describeEvent } from '@/lib/format'
import { ACTIONS_CLASS, BACK_LABEL, EMPTY_TEXT, GRID_CLASS, LOADING_TEXT, LOAD_ERROR_TEXT, OPENED_CAPTION_CLASS, PLAYER_WRAP_CLASS, SECTION_CLASS, THUMB_CLASS, TITLE_TEXT } from './constants'
import { captionOf, playablePath } from './helpers'
import type { HomeUIProps } from './types'

const HomeUI = ({ apiKey, events, failed, opened, durations, onDuration, onOpen, onBack }: HomeUIProps) => {
  if (failed) return <Notice text={LOAD_ERROR_TEXT} />
  if (events === null) return <Notice text={LOADING_TEXT} />
  const path = opened ? playablePath(opened) : null
  if (opened && path) {
    return (
      <div className={SECTION_CLASS}>
        <div className={ACTIONS_CLASS}>
          <Button onClick={onBack}>{BACK_LABEL}</Button>
          <ShareButton path={path} name={opened.id} title={describeEvent(opened)} />
        </div>
        <p className={OPENED_CAPTION_CLASS}>
          {opened.camera} · {captionOf(opened, durations[opened.id])}
        </p>
        <div className={PLAYER_WRAP_CLASS}>
          <ClipPlayer key={path} apiKey={apiKey} path={path} onClose={onBack} audioSrc={opened.clip_audio ?? undefined} />
        </div>
      </div>
    )
  }
  if (events.length === 0) return <Notice text={EMPTY_TEXT} />
  return (
    <>
      <SectionTitle text={TITLE_TEXT} />
      <div className={GRID_CLASS}>
        {events.map((event) => {
          const clip = playablePath(event)
          return (
            <CameraTile
              key={event.id}
              name={event.camera}
              caption={captionOf(event, durations[event.id])}
              media={clip ? <video className={THUMB_CLASS} src={clip} preload="metadata" muted playsInline onLoadedMetadata={(e) => onDuration(event.id, e.currentTarget.duration)} /> : null}
              onOpen={() => onOpen(event.id)}
            />
          )
        })}
      </div>
    </>
  )
}

export default HomeUI
