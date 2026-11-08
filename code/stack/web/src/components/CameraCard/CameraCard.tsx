import { useCallback, useEffect, useState } from 'react'
import { Button, CameraCard as CameraCardUI, SnapshotImage as ImageBox, Tabs, ValueChips, ZoneEditor } from '@house/ui'
import ClipPlayer from '@/components/ClipPlayer'
import CameraIndicators from '@/components/CameraIndicators'
import PowerButton from '@/components/PowerButton'
import RotatedMedia from '@/components/RotatedMedia'
import ShareButton from '@/components/ShareButton'
import { setClipSaved } from '@/lib/api'
import { rememberClipDuration } from '@/lib/clipDurations'
import { describeEvent } from '@/lib/format'
import { liveSrc } from '@/lib/live'
import { useBigView } from '@/lib/useBigView'
import { useMobile } from '@/lib/useMobile'
import { formatClock, useClock } from '@/lib/useClock'
import { usePinchZoom } from '@/lib/usePinchZoom'
import { useLamp } from '@/lib/useLamp'
import { usePlug } from '@/lib/usePlug'
import { useSensors } from '@/lib/useSensors'
import { useRecording } from '@/lib/useRecording'
import { useZone } from '@/lib/useZone'
import { usePower } from '@/lib/usePower'
import SnapshotImage from '@/components/SnapshotImage'
import Timeline from '@/components/Timeline'
import type { EventRow } from '@/types'
import {
  CAMERA_OFF_TEXT,
  CAMERA_STARTING_TEXT,
  CAMERA_TITLE_PREFIX,
  HIDDEN_PLAYER_CLASS,
  LIVE_QUALITY_LABEL,
  LIVE_QUALITY_OPTIONS,
  NO_CLIP_TEXT,
  NO_IMAGE_TEXT,
  ONGOING_CLIP_TEXT,
  QUALITY_LABEL,
  QUALITY_OPTIONS,
  QUALITY_OPTIONS_SHORT,
  SAVE_LABEL,
  SAVE_OPTIONS,
  CAMERA_LAMP,
  CAMERA_WITH_PLUG,
  CAMERA_SENSOR,
  MEDIA_HOST_CLASS,
  CONTROLS_OVERLAY_CLASS,
  RECORD_FAILED_TEXT,
  RECORD_LABEL,
  RECORD_NOTE_CLASS,
  RECORD_STOP_LABEL,
  RECORD_STOPPED_DETAIL,
  RECORD_STOPPED_TEXT,
  ZONE_BUTTON_LABEL,
  ZONE_FAILED_CLASS,
  ZONE_FAILED_TEXT,
  ZONE_RESET_LABEL,
} from './constants'
import { captionOf, clipLead, clipPathOf, liveCaption, orientationShown, temperatureItems } from './helpers'
import type { CameraCardProps, LiveQuality, Quality } from './types'

/**
 * Une caméra : en haut le direct (flux MJPEG relayé par l'API depuis go2rtc), remplacée par l'image gardée
 * à l'instant choisi sur la frise ou par le clip de l'événement choisi ; puis la frise.
 * La carte elle-même (@house/ui) ne sait rien de tout ça : elle reçoit le média et la frise déjà rendus.
 */
const CameraCard = ({ apiKey, camera, events, onBack, initialEventId, onRead }: CameraCardProps) => {
  // Sur téléphone (sous 1024 px) : un écran fixe, la vidéo sur le tiers du haut, la frise sur le reste.
  const mobile = useMobile()
  const [cursor, setCursor] = useState<number | null>(null)
  // L'événement cliqué ; sa version à jour (clip copié, fin du mouvement) vient de la liste relue chaque seconde.
  const [picked, setSelected] = useState<EventRow | null>(() => events.find((event) => event.id === initialEventId && event.clip) ?? null)
  const selected = picked ? (events.find((event) => event.id === picked.id) ?? picked) : null
  const [playhead, setPlayhead] = useState<number | null>(() => (picked ? (picked.clip_started_at ?? picked.started_at) : null))
  // La durée réelle de la vidéo, une fois connue.
  // Compte les clics sur un événement : chaque clic relance le clip depuis son début.
  const [plays, setPlays] = useState(0)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  // La version du clip à lire (la légère par défaut : tous les appareils la lisent) et d'où la reprendre quand on en change.
  const [quality, setQuality] = useState<Quality>('h264')
  const [resumeAt, setResumeAt] = useState(0)
  // La résolution réelle du direct, lue dans l'image du navigateur à la première image reçue.
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null)
  // Le direct en 4K par défaut (le 4K est recodé en MJPEG par le mini PC : lourd) ; « Léger » reste au choix.
  const [liveQuality, setLiveQuality] = useState<LiveQuality>('hd')
  // Le clip dont la vidéo est téléchargée : tant que ce n'est pas celui de l'événement choisi, on garde l'image.
  const [readyClip, setReadyClip] = useState<string | null>(null)
  // Le clip que l'appareil n'arrive pas à lire : son message (et « Fermer ») doivent se voir, pas rester dans le lecteur caché.
  const [failedClip, setFailedClip] = useState('')
  // L'alimentation lue sur le switch : coupée, le direct laisse place à une image noire.
  const { power, setPower, failed: powerFailed } = usePower(apiKey, camera.name)
  // « Afficher en grand » : le média en plein écran, en paysage.
  // Caméra posée de côté : tout son média (direct, image, clip, zone) est tourné d'un quart de tour horaire, donc en portrait ; la vue en grand reste en portrait.
  // L'orientation de ce qu'on regarde : celle de l'événement (un clip pris avant que la caméra soit tournée reste en paysage), celle de l'événement le plus récent avant l'instant d'une image gardée, sinon celle de la caméra.
  const turned = orientationShown(camera, selected, cursor, events) === 'portrait'
  const bigView = useBigView(turned)
  // Le zoom au doigt de la vue en grand (pincer, déplacer, double toucher).
  // Zoom au doigt : en vue en grand, et sur la vidéo de l'écran du téléphone (où elle n'est pas tournée) ; un autre média (direct, image, autre clip) ou l'entrée et la sortie de la vue en grand le remettent à zéro.
  const pinchZoom = usePinchZoom(
    bigView.big || mobile,
    bigView.big && !turned,
    `${selected?.id ?? (cursor !== null ? 'image' : 'live')}${bigView.big ? ':big' : ''}`,
    !mobile && bigView.big,
  )
  const now = useClock(bigView.big)
  // La température du détecteur de la caméra (« motion exterieur » pour voliere-exterieur, « motion interieur » pour voliere-interieur), sur la vidéo.
  const sensorId = CAMERA_SENSOR[camera.name]
  const showTemperatures = sensorId !== undefined
  const sensors = useSensors(apiKey, showTemperatures)
  // La température ne se montre qu'en direct : pas pendant un clip ni sur l'image d'un instant passé (elle serait celle d'aujourd'hui).
  const isLive = picked === null && cursor === null
  const temperatures = showTemperatures && isLive ? temperatureItems(sensors, [sensorId]) : []
  // Le rond de la lampe de la caméra (« Perruche » pour voliere-interieur), à côté de la température et seulement en direct comme elle.
  const lampId = CAMERA_LAMP[camera.name]
  const lamp = useLamp(apiKey, lampId, lampId !== undefined && isLive)
  // Le carré de la prise connectée, à côté du rond de la lampe (vert allumée, rouge éteinte), en direct aussi.
  const plug = usePlug(apiKey, CAMERA_WITH_PLUG.includes(camera.name) && isLive)
  const indicators =
    isLive && (temperatures.length > 0 || lamp !== null || plug !== null) ? (
      <CameraIndicators temperatures={temperatures.map((item) => item.value)} lamp={lamp} plug={plug} />
    ) : undefined
  const off = power !== null && !power.on
  // Courant mis mais flux pas encore reçu : la caméra démarre (environ une minute), le direct reviendra tout seul.
  const starting = power !== null && power.on && !power.streaming
  const placeholder = off ? CAMERA_OFF_TEXT : starting ? CAMERA_STARTING_TEXT : ''

  // La zone de surveillance du mouvement : un polygone (par défaut toute l'image) qu'on réduit en glissant ses sommets sur le direct ; House API le garde.
  const [editingZone, setEditingZone] = useState(false)
  const zone = useZone(apiKey, camera.name)
  const zoneEditing = editingZone && isLive && !placeholder && !mobile
  // Le clip enregistré à la main : le bouton « Enregistrer un clip » (en direct, caméra allumée, pas sur téléphone : ni lui ni la zone de surveillance n'y sont proposés).
  const recorder = useRecording(apiKey, camera.name, isLive && !placeholder && !mobile)
  // Caméra tournée : les commandes natives de la vidéo tourneraient avec elle ; le lecteur les pose ici, sous la vidéo, droites (hors vue en grand, où il n'y a pas de place).
  const [controlsHost, setControlsHost] = useState<HTMLDivElement | null>(null)
  const uprightControls = turned

  // Un clip ouvert est un clip lu.
  const selectedId = selected?.id
  useEffect(() => {
    if (selectedId && onRead) onRead(selectedId)
  }, [selectedId, onRead])

  const lead = selected ? clipLead(selected, videoDuration) : 0
  // Ce que la vidéo couvre sur la frise : elle commence `lead` avant l'événement et dure `videoDuration`.
  const clipRange =
    selected?.clip && videoDuration !== null ? { start: selected.started_at - lead, end: selected.started_at - lead + videoDuration } : null
  const clipPath = selected ? clipPathOf(selected, quality) : null
  const onReady = useCallback(() => setReadyClip(clipPath), [clipPath])
  const selectedForDuration = selected?.id
  const onDuration = useCallback(
    (seconds: number) => {
      setVideoDuration(seconds)
      // Le lecteur n'existe que pour un événement choisi : l'identifiant est toujours là (garde pour TypeScript).
      /* v8 ignore next */
      if (selectedForDuration) rememberClipDuration(selectedForDuration, seconds)
    },
    [selectedForDuration],
  )
  // Le direct : un flux MJPEG que l'API relaie depuis go2rtc ; une seule requête, les images arrivent toutes seules.
  const live = liveSrc(camera.name, liveQuality === 'hd', mobile)

  // Changer de direct : la résolution lue à la première image n'est plus valable.
  const changeLiveQuality = (next: LiveQuality) => {
    if (next === liveQuality) return
    setLiveSize(null)
    setLiveQuality(next)
  }

  // Changer de version reprend la lecture là où elle en est.
  const changeQuality = (next: Quality) => {
    if (next === quality) return
    setResumeAt(playhead !== null && selected ? Math.max(0, playhead - (selected.started_at - lead)) : 0)
    setQuality(next)
  }

  // Le clip sauvegardé : l'état de la liste d'événements, ou celui qu'on vient de choisir (la liste se relit plus tard). Un échec remet l'état d'avant.
  const [savedChoice, setSavedChoice] = useState<Record<string, boolean>>({})
  const isSaved = selected ? (savedChoice[selected.id] ?? selected.saved) : false
  const changeSaved = (next: string) => {
    if (!selected || (next === 'yes') === isSaved) return
    const id = selected.id
    const before = isSaved
    setSavedChoice((current) => ({ ...current, [id]: next === 'yes' }))
    setClipSaved(apiKey, id, next === 'yes').catch(() => setSavedChoice((current) => ({ ...current, [id]: before })))
  }

  // L'interrupteur « Sauvegardé » n'existe que sur grand écran : sur téléphone on ne sauvegarde pas un clip (seul le partage d'un clip déjà sauvegardé reste).
  const saveToggle = <Tabs label={SAVE_LABEL} options={[...SAVE_OPTIONS]} value={isSaved ? 'yes' : 'no'} onChange={changeSaved} compact />

  // Un clip sauvegardé se partage : le menu de partage du système sur téléphone, le téléchargement ailleurs.
  const sharePath = selected ? (selected.clip_h264 ?? selected.clip) : null
  const shareButton =
    isSaved && selected && sharePath ? <ShareButton path={sharePath} name={selected.id} title={describeEvent(selected)} /> : null

  const back = () => {
    setFailedClip('')
    setCursor(null)
    setSelected(null)
    setPlayhead(null)
  }

  // Ce qui est montré en haut, dans l'ordre de priorité : le clip, l'événement en cours, l'image d'un instant, la dernière image.
  const ongoing = selected !== null && selected.ended_at === null
  const clipReady = clipPath !== null && clipPath === readyClip
  const clipFailed = clipPath !== null && clipPath === failedClip
  // Un événement choisi dont la vidéo n'est pas encore là (en cours, ou fini mais pas encore copié) : un cadre noir et ce qu'on attend.
  const pendingText = selected && !selected.clip ? (ongoing ? ONGOING_CLIP_TEXT : NO_CLIP_TEXT) : ''
  const still = pendingText ? (
    <ImageBox src="" message={pendingText} upright={turned} />
  ) : cursor !== null ? (
    <SnapshotImage apiKey={apiKey} camera={camera.name} at={cursor} upright={turned} />
  ) : (
    <ImageBox
      src={placeholder ? '' : live}
      message={placeholder || NO_IMAGE_TEXT}
      upright={turned}
      onSize={(width, height) => setLiveSize({ width, height })}
    />
  )
  // Le lecteur se monte dès le choix (il télécharge le clip) mais reste caché : l'image reste en place jusqu'à ce que la vidéo soit là.
  const media = (
    <RotatedMedia
      turned={turned}
      overlay={uprightControls && clipPath ? <div ref={setControlsHost} className={CONTROLS_OVERLAY_CLASS} /> : undefined}
    >
      <div className={MEDIA_HOST_CLASS}>
        {selected && clipPath ? (
          <div className={clipReady || clipFailed ? undefined : HIDDEN_PLAYER_CLASS}>
            <ClipPlayer
              key={clipPath}
              apiKey={apiKey}
              path={clipPath}
              audioSrc={selected.clip_audio ?? undefined}
              startAt={resumeAt}
              restart={plays}
              onClose={back}
              controlsHost={uprightControls ? controlsHost : null}
              onReady={onReady}
              onFailure={() => setFailedClip(clipPath)}
              onTime={(seconds) => setPlayhead(selected.started_at - lead + seconds)}
              onDuration={onDuration}
            />
          </div>
        ) : null}
        {clipReady || clipFailed ? null : still}
        {zoneEditing ? <ZoneEditor points={zone.points} onChange={zone.change} onCommit={zone.commit} quarterTurn={turned} /> : null}
      </div>
    </RotatedMedia>
  )

  return (
    <CameraCardUI
      screen={mobile}
      onBack={onBack}
      backLabel={camera.name}
      name={`${CAMERA_TITLE_PREFIX}${camera.name}`}
      caption={captionOf(cursor, selected, liveCaption(placeholder ? null : liveSize))}
      actions={
        <>
          {selected?.clip && !mobile ? saveToggle : null}
          {!mobile ? shareButton : null}
          {selected?.clip_h264 ? (
            <Tabs
              label={QUALITY_LABEL}
              compact
              options={[...(mobile ? QUALITY_OPTIONS_SHORT : QUALITY_OPTIONS)]}
              value={quality}
              onChange={changeQuality}
            />
          ) : null}
          {selected || cursor !== null ? null : (
            <Tabs label={LIVE_QUALITY_LABEL} options={[...LIVE_QUALITY_OPTIONS]} value={liveQuality} onChange={changeLiveQuality} compact />
          )}
          {isLive && !placeholder && !mobile ? (
            <Button variant={zoneEditing ? 'active' : 'default'} aria-pressed={zoneEditing} onClick={() => setEditingZone((on) => !on)}>
              {ZONE_BUTTON_LABEL}
            </Button>
          ) : null}
          {isLive && !placeholder && !mobile ? (
            <Button variant={recorder.recording ? 'danger' : 'default'} disabled={recorder.busy} onClick={() => void recorder.toggle()}>
              {recorder.recording
                ? `${RECORD_STOP_LABEL} (${Math.floor(recorder.seconds / 60)}:${String(recorder.seconds % 60).padStart(2, '0')})`
                : RECORD_LABEL}
            </Button>
          ) : null}
          {recorder.failed ? <span className={ZONE_FAILED_CLASS}>{RECORD_FAILED_TEXT}</span> : null}
          {recorder.stopped && !recorder.recording ? (
            <span className={RECORD_NOTE_CLASS}>
              {RECORD_STOPPED_TEXT}
              <br />
              {RECORD_STOPPED_DETAIL}
            </span>
          ) : null}
          {zoneEditing && zone.reduced ? <Button onClick={zone.reset}>{ZONE_RESET_LABEL}</Button> : null}
          {zoneEditing && zone.failed ? <span className={ZONE_FAILED_CLASS}>{ZONE_FAILED_TEXT}</span> : null}
          <PowerButton apiKey={apiKey} camera={camera.name} power={power} unavailable={powerFailed} hideOff={mobile} onPower={setPower} />
        </>
      }
      media={media}
      figureRef={bigView.ref}
      expanded={bigView.big}
      onExpand={bigView.open}
      onCollapse={bigView.close}
      // Pendant le dessin de la zone, les gestes du média (zoom, déplacement) laissent place aux sommets.
      portraitMedia={turned}
      mediaGesture={zoneEditing ? undefined : pinchZoom}
      // Sur téléphone, seulement les valeurs, un bloc chacune (sans le nom du capteur) ; sur grand écran, une ligne par capteur.
      // Sur téléphone, en bas à gauche de la vidéo : le partage d'un clip déjà sauvegardé pendant un clip (pas d'interrupteur « Sauvegardé » sur téléphone), sinon la température.
      details={mobile ? (selected?.clip ? (shareButton ?? undefined) : indicators) : undefined}
      // En vue en grand, l'heure en bas à droite : celle de l'image ou du clip regardé (le curseur de la frise), sinon l'heure présente.
      clock={bigView.big ? <ValueChips values={[formatClock(cursor ?? now)]} /> : undefined}
      overlay={indicators && !mobile ? indicators : undefined}
      timeline={
        <Timeline
          fill={mobile}
          apiKey={apiKey}
          camera={camera.name}
          events={events}
          selectedEventId={selected?.id ?? ''}
          playhead={playhead}
          clipRange={clipRange}
          onCursor={setCursor}
          onEvent={(event, at) => {
            // Le même clip rouvert garde sa durée (son lecteur ne la relit pas) ; un autre événement l'oublie.
            if (event?.id !== picked?.id) setVideoDuration(null)
            setSelected(event)
            setPlays((count) => count + 1)
            setResumeAt(0)
            setPlayhead(at)
          }}
        />
      }
    />
  )
}

export default CameraCard
