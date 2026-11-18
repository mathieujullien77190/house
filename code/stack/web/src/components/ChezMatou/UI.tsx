import { CameraTile, LightsPanel, Notice, SectionTitle, SnapshotImage as ImageBox } from '@house/ui'
import { AcUnitCard } from '@/components/AcPanel'
import RotatedMedia from '@/components/RotatedMedia'
import { ShutterCard } from '@/components/ShuttersPanel'
import CameraView from './CameraView'
import {
  AC_MODES_ALLOWED,
  AC_TARGET_RANGE,
  AC_TITLE,
  CAMERAS_CLASS,
  CAMERAS_TITLE,
  EMPTY_TEXT,
  ERROR_CLASS,
  ERROR_TEXT,
  HEAD_CLASS,
  LIGHTS_TITLE,
  LIST_CLASS,
  LOADING_TEXT,
  NO_IMAGE_TEXT,
  PAGE_CLASS,
  PROBLEM_TEXT,
  SECTION_CLASS,
  SHUTTERS_TITLE,
  TILE_PORTRAIT_CLASS,
  TITLE,
  TITLE_CLASS,
} from './constants'
import type { ChezMatouUIProps } from './types'

const ChezMatouUI = ({
  state,
  problem,
  rooms,
  shutters,
  acUnits,
  streamUrl,
  onStreamError,
  opened,
  onOpenCamera,
  onCloseCamera,
  busy,
  error,
  onShutter,
  onRoom,
  onLight,
  onAc,
}: ChezMatouUIProps) => {
  const nothing = state !== null && state.cameras === null && state.shutters === null && state.lights === null && state.ac === null
  const openedCamera = state?.cameras?.find((camera) => camera.id === opened) ?? null
  return (
    <main className={PAGE_CLASS}>
      <header className={HEAD_CLASS}>
        <h1 className={TITLE_CLASS}>{TITLE}</h1>
      </header>
      {problem ? <Notice text={PROBLEM_TEXT[problem]} /> : null}
      {!problem && state === null ? <Notice text={LOADING_TEXT} /> : null}
      {nothing ? <Notice text={EMPTY_TEXT} /> : null}
      {error ? <span className={ERROR_CLASS}>{ERROR_TEXT}</span> : null}

      {state?.cameras ? (
        <section className={SECTION_CLASS}>
          <SectionTitle text={CAMERAS_TITLE} />
          <div className={CAMERAS_CLASS} onErrorCapture={onStreamError}>
            {state.cameras.map((camera) => {
              const turned = camera.orientation === 'portrait'
              return (
                <div key={camera.id} className={turned ? TILE_PORTRAIT_CLASS : undefined}>
                  <CameraTile
                    name={camera.name}
                    media={
                      <RotatedMedia turned={turned}>
                        <ImageBox src={streamUrl(camera.id) ?? ''} message={NO_IMAGE_TEXT} upright={turned} />
                      </RotatedMedia>
                    }
                    onOpen={() => onOpenCamera(camera.id)}
                  />
                </div>
              )
            })}
          </div>
          {openedCamera ? (
            <CameraView camera={openedCamera} lightUrl={streamUrl(openedCamera.id)} hdUrl={streamUrl(openedCamera.id, true)} onStreamError={onStreamError} onClose={onCloseCamera} />
          ) : null}
        </section>
      ) : null}

      {state?.shutters ? (
        <section className={SECTION_CLASS}>
          <SectionTitle text={SHUTTERS_TITLE} />
          <div className={LIST_CLASS}>
            {shutters.map((shutter) => (
              <ShutterCard
                key={shutter.id}
                shutter={shutter}
                busy={busy === `shutter:${shutter.id}`}
                failed={null}
                onSend={(command) => onShutter(shutter.id, command)}
                onHalf={() => undefined}
                onAuto={() => undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {state?.lights ? (
        <section className={SECTION_CLASS}>
          <SectionTitle text={LIGHTS_TITLE} />
          <LightsPanel
            rooms={rooms}
            busy={busy ?? ''}
            drafts={{}}
            showAll={false}
            onAll={() => undefined}
            onDraft={() => undefined}
            onRoom={(roomId, change) => change.on !== undefined && onRoom(roomId, change.on)}
            onLight={(lightId, change) => change.on !== undefined && onLight(lightId, change.on)}
          />
        </section>
      ) : null}

      {state?.ac ? (
        <section className={SECTION_CLASS}>
          <SectionTitle text={AC_TITLE} />
          <div className={LIST_CLASS}>
            {acUnits.map((unit) => (
              <AcUnitCard key={unit.id} unit={unit} busy={busy === `ac:${unit.id}`} failed={false} withVanes={false} modes={AC_MODES_ALLOWED} range={AC_TARGET_RANGE} onChange={(patch) => onAc(unit.id, patch)} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

export default ChezMatouUI
