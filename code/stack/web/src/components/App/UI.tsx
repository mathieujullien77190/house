import { Button, Notice, Page, TopBar } from '@house/ui'
import Weather from '@/components/Weather'
import AcPanel from '@/components/AcPanel'
import BoxPanel from '@/components/BoxPanel'
import CameraCard from '@/components/CameraCard'
import CameraMosaic from '@/components/CameraMosaic'
import GuestPanel from '@/components/GuestPanel'
import Home from '@/components/Home'
import SavedClips from '@/components/SavedClips'
import KeyForm from '@/components/KeyForm'
import Lights from '@/components/Lights'
import PlugPanel from '@/components/PlugPanel'
import ShuttersPanel from '@/components/ShuttersPanel'
import TvLive from '@/components/TvLive'
import TvPanel from '@/components/TvPanel'
import {
  BACK_CLASS,
  NOTIFY_LABEL,
  NOTIFY_TITLE,
  THEME_LABEL,
  THEME_TITLE,
  BACK_LABEL,
  CHECKING_TEXT,
  HOME_LABEL,
  LOCKED_TEXT,
  NO_CAMERA_TEXT,
  TABS_LABEL,
  TITLE,
} from './constants'
import { eventsOf } from './helpers'
import type { AppUIProps } from './types'

const AppUI = ({
  tv,
  liveCamera,
  onLiveCamera,
  status,
  message,
  apiKey,
  cameras,
  events,
  mobile,
  notify,
  onNotify,
  theme,
  onTheme,
  tab,
  openCamera,
  openEvent,
  openAt,
  openRate,
  openSound,
  isRead,
  onRead,
  onOpenCamera,
  tabs,
  onTab,
  onConnect,
}: AppUIProps) => {
  const ready = status === 'ready'
  // La caméra ouverte en détail, si elle existe encore ; sinon la mosaïque.
  const current = cameras.find((camera) => camera.name === openCamera)
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : ''
  // Sur téléphone, la vue d'une caméra est un écran à part : ni titre, ni menu, ni son, ni « Oublier la clé » (le bouton retour est dans la carte).
  if (ready && mobile && tab === 'cameras' && current) {
    return (
      <CameraCard
        // Une autre caméra (un clic sur une icône de caméra) : l'écran est recréé, rien de la précédente ne reste (lampe, prise, zone, clip, son).
        key={current.name}
        apiKey={apiKey}
        camera={current}
        events={eventsOf(events, current.name)}
        initialEventId={openEvent}
        initialCursor={openAt}
        initialRate={openRate}
        initialSound={openSound}
        onRead={onRead}
        others={cameras.filter((other) => other.name !== current.name).map((other) => other.name)}
        onOpenCamera={(name, at, rate, sound) => onOpenCamera(name, undefined, at, rate, sound)}
        onBack={() => onOpenCamera(null)}
      />
    )
  }
  // Sur téléphone, la télécommande TV est seule à l'écran : ni titre ni menu, son bouton « Retour » ramène à Home.
  if (ready && mobile && tab === 'tv')
    return (
      <Page>
        <TvPanel apiKey={apiKey} onBack={() => onTab('home')} />
      </Page>
    )
  // Pareil pour le plan des lumières : un écran à part, la flèche retour ramène aux caméras.
  // Sur la télé, la Home est seule à l'écran : ni titre, ni menu, ni météo, la carte en grand.
  const bare = ready && tv && tab === 'home'
  return (
    <Page>
      {bare ? null : <TopBar
        title={TITLE}
        // Un clic sur le titre rafraîchit la page (elle se rouvre sur Home, `DEFAULT_TAB`).
        onTitle={ready ? () => window.location.reload() : undefined}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        info={ready ? <Weather apiKey={apiKey} /> : undefined}
        tabs={ready && !tv ? { label: TABS_LABEL, options: tabs, value: tab, onChange: onTab } : undefined}
        // Les boutons du thème et des notifications restent dans la barre (sur téléphone : juste à gauche du sandwich).
        barActions={
          <>
            <Button aria-label={THEME_TITLE[theme]} title={THEME_TITLE[theme]} onClick={onTheme}>
              {THEME_LABEL[theme]}
            </Button>
            {ready && notify !== 'unsupported' ? (
              <Button
                variant={notify === 'on' ? 'active' : 'default'}
                disabled={notify === 'denied'}
                aria-label={NOTIFY_TITLE[notify]}
                title={NOTIFY_TITLE[notify]}
                onClick={onNotify}
              >
                {NOTIFY_LABEL[notify]}
              </Button>
            ) : null}
          </>
        }
      />}

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}

      {/* Sur la télé il n'y a pas de menu : un bouton ramène de toute autre page à la Home. */}
      {ready && tv && tab !== 'home' ? (
        <div className={BACK_CLASS}>
          <Button
            onClick={() => {
              onOpenCamera(null)
              onTab('home')
            }}
          >
            {HOME_LABEL}
          </Button>
        </div>
      ) : null}

      {ready ? (
        <>
          {/* La Home reste montée quand on change d'onglet (juste cachée) : la carte, le bloc ou le clip choisi et les flux des miniatures de caméras restent chargés pendant la session. */}
          <div hidden={tab !== 'home'}>
            <Home
              apiKey={apiKey}
              cameras={cameras}
              onOpenCamera={(camera, eventId) => {
                // Sur la télé, ouvrir une caméra montre son direct en grand, seul ; un clip (emoji) ouvre la page de la caméra.
                if (tv && !eventId) {
                  onLiveCamera(camera)
                  return
                }
                onTab('cameras')
                onOpenCamera(camera, eventId)
              }}
              events={events}
              isRead={isRead}
              onOpenAc={() => onTab('ac')}
              onOpenShutter={() => onTab('shutters')}
              onOpenPlug={() => onTab('plug')}
              onOpenBox={() => onTab('box')}
            />
          </div>
          {tab === 'cameras' ? (
            cameras.length === 0 ? (
              <Notice text={NO_CAMERA_TEXT} />
            ) : current ? (
              <>
                <div className={BACK_CLASS}>
                  <Button onClick={() => onOpenCamera(null)}>{BACK_LABEL}</Button>
                </div>
                <CameraCard
                  key={current.name}
                  apiKey={apiKey}
                  camera={current}
                  events={eventsOf(events, current.name)}
                  initialEventId={openEvent}
                  initialCursor={openAt}
                  initialRate={openRate}
                  initialSound={openSound}
                  onRead={onRead}
                  others={cameras.filter((other) => other.name !== current.name).map((other) => other.name)}
                  onOpenCamera={(name, at, rate, sound) => onOpenCamera(name, undefined, at, rate, sound)}
                />
              </>
            ) : (
              <>
                <CameraMosaic apiKey={apiKey} cameras={cameras} events={events} isRead={isRead} onOpen={onOpenCamera} />
                <SavedClips apiKey={apiKey} onOpenCamera={onOpenCamera} />
              </>
            )
          ) : null}
          {tab === 'lights' ? <Lights apiKey={apiKey} /> : null}
          {tab === 'shutters' ? <ShuttersPanel apiKey={apiKey} /> : null}
          {tab === 'ac' ? <AcPanel apiKey={apiKey} /> : null}
          {tab === 'plug' ? <PlugPanel apiKey={apiKey} /> : null}
          {tab === 'box' ? <BoxPanel apiKey={apiKey} /> : null}
          {tab === 'tv' ? <TvPanel apiKey={apiKey} /> : null}
          {tab === 'guest' ? <GuestPanel apiKey={apiKey} /> : null}
        </>
      ) : null}
      {/* Sur la télé : le direct de la caméra ouverte, en grand et seul ; Retour le ferme. */}
      {ready && tv && liveCamera && cameras.find((camera) => camera.name === liveCamera) ? (
        <TvLive camera={cameras.find((camera) => camera.name === liveCamera) as (typeof cameras)[number]} onClose={() => onLiveCamera(null)} />
      ) : null}
    </Page>
  )
}

export default AppUI
