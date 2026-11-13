import { Button, Notice, Page, TopBar } from '@house/ui'
import Weather from '@/components/Weather'
import AcPanel from '@/components/AcPanel'
import BoxPanel from '@/components/BoxPanel'
import CameraCard from '@/components/CameraCard'
import CameraMosaic from '@/components/CameraMosaic'
import Home from '@/components/Home'
import SavedClips from '@/components/SavedClips'
import KeyForm from '@/components/KeyForm'
import Lights from '@/components/Lights'
import PlugPanel from '@/components/PlugPanel'
import ShuttersPanel from '@/components/ShuttersPanel'
import TvPanel from '@/components/TvPanel'
import {
  BACK_CLASS,
  NOTIFY_LABEL,
  NOTIFY_TITLE,
  BACK_LABEL,
  CHECKING_TEXT,
  LOCKED_TEXT,
  NO_CAMERA_TEXT,
  TABS_LABEL,
  TITLE,
} from './constants'
import { eventsOf } from './helpers'
import type { AppUIProps } from './types'

const AppUI = ({
  status,
  message,
  apiKey,
  cameras,
  events,
  mobile,
  notify,
  onNotify,
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
  return (
    <Page>
      <TopBar
        title={TITLE}
        // Un clic sur le titre rafraîchit la page (elle se rouvre sur Home, `DEFAULT_TAB`).
        onTitle={ready ? () => window.location.reload() : undefined}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        info={ready ? <Weather apiKey={apiKey} /> : undefined}
        tabs={ready ? { label: TABS_LABEL, options: tabs, value: tab, onChange: onTab } : undefined}
        // Le bouton des notifications reste dans la barre (sur téléphone : juste à gauche du sandwich).
        barActions={
          ready && notify !== 'unsupported' ? (
            <Button
              variant={notify === 'on' ? 'active' : 'default'}
              disabled={notify === 'denied'}
              aria-label={NOTIFY_TITLE[notify]}
              title={NOTIFY_TITLE[notify]}
              onClick={onNotify}
            >
              {NOTIFY_LABEL[notify]}
            </Button>
          ) : undefined
        }
      />

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}

      {ready ? (
        <>
          {/* La Home reste montée quand on change d'onglet (juste cachée) : la carte, le bloc ou le clip choisi et les flux des miniatures de caméras restent chargés pendant la session. */}
          <div hidden={tab !== 'home'}>
            <Home
              apiKey={apiKey}
              cameras={cameras}
              onOpenCamera={(camera, eventId) => {
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
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
