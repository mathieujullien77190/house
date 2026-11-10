import { Button, CameraTile, Notice, SectionTitle, Tabs } from '@house/ui'
import ClipEmoji from '@/components/ClipEmoji'
import ClipNote from '@/components/ClipNote'
import ClipPlayer from '@/components/ClipPlayer'
import FullscreenBox from '@/components/FullscreenBox'
import PortraitClip from '@/components/PortraitClip'
import ShareButton from '@/components/ShareButton'
import { describeEvent } from '@/lib/format'
import {
  ACTIONS_CLASS,
  BACK_LABEL,
  EMPTY_TEXT,
  GRID_CLASS,
  LOADING_TEXT,
  LOAD_ERROR_TEXT,
  OPENED_CAPTION_CLASS,
  PLAYER_WRAP_CLASS,
  SAVE_FAILED_CLASS,
  SAVE_FAILED_TEXT,
  SAVE_LABEL,
  SAVE_OPTIONS,
  SECTION_CLASS,
  THUMB_BOX_CLASS,
  THUMB_CLASS,
  THUMB_TURNED_CLASS,
  TITLE_TEXT,
} from './constants'
import { captionOf, playablePath } from './helpers'
import type { SavedClipsUIProps } from './types'

const SavedClipsUI = ({
  apiKey,
  events,
  failed,
  opened,
  durations,
  onDuration,
  saved,
  onSave,
  saveFailed,
  onNote,
  onEmoji,
  onOpen,
  onBack,
}: SavedClipsUIProps) => {
  if (failed) return <Notice text={LOAD_ERROR_TEXT} />
  if (events === null) return <Notice text={LOADING_TEXT} />
  const path = opened ? playablePath(opened) : null
  if (opened && path) {
    return (
      <div className={SECTION_CLASS}>
        <div className={ACTIONS_CLASS}>
          <Button onClick={onBack}>{BACK_LABEL}</Button>
          <Tabs label={SAVE_LABEL} options={[...SAVE_OPTIONS]} value={saved ? 'yes' : 'no'} onChange={(id) => onSave(id === 'yes')} />
          {saveFailed ? <span className={SAVE_FAILED_CLASS}>{SAVE_FAILED_TEXT}</span> : null}
          <ShareButton path={path} name={opened.id} title={describeEvent(opened)} />
        </div>
        <p className={OPENED_CAPTION_CLASS}>
          {opened.camera} · {captionOf(opened, durations[opened.id])}
        </p>
        <ClipNote key={opened.id} note={opened.note} onSave={(text) => onNote(opened.id, text)} />
        <ClipEmoji key={`emoji-${opened.id}`} emoji={opened.emoji ?? ''} onSave={(value) => onEmoji(opened.id, value)} />
        <div className={PLAYER_WRAP_CLASS}>
          <FullscreenBox>
            {opened.orientation === 'portrait' ? (
              <PortraitClip key={path} apiKey={apiKey} path={path} onClose={onBack} audioSrc={opened.clip_audio ?? undefined} />
            ) : (
              <ClipPlayer key={path} apiKey={apiKey} path={path} onClose={onBack} audioSrc={opened.clip_audio ?? undefined} />
            )}
          </FullscreenBox>
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
            <div key={event.id}>
              <CameraTile
                name={event.camera}
                caption={captionOf(event, durations[event.id])}
                media={
                  clip ? (
                    event.orientation === 'portrait' ? (
                      <div className={THUMB_BOX_CLASS}>
                        <video
                          className={THUMB_TURNED_CLASS}
                          src={clip}
                          preload="metadata"
                          muted
                          playsInline
                          onLoadedMetadata={(e) => onDuration(event.id, e.currentTarget.duration)}
                        />
                      </div>
                    ) : (
                      <video
                        className={THUMB_CLASS}
                        src={clip}
                        preload="metadata"
                        muted
                        playsInline
                        onLoadedMetadata={(e) => onDuration(event.id, e.currentTarget.duration)}
                      />
                    )
                  ) : null
                }
                onOpen={() => onOpen(event.id)}
              />
              <ClipNote note={event.note} onSave={(text) => onNote(event.id, text)} />
              <ClipEmoji emoji={event.emoji ?? ''} onSave={(value) => onEmoji(event.id, value)} />
            </div>
          )
        })}
      </div>
    </>
  )
}

export default SavedClipsUI
