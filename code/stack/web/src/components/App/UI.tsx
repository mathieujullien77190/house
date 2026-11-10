import { Button, Notice, Page, TopBar } from '@house/ui'
import Weather from '@/components/Weather'
import ApiExplorer from '@/components/ApiExplorer'
import CameraCard from '@/components/CameraCard'
import CameraMosaic from '@/components/CameraMosaic'
import Home from '@/components/Home'
import KeyForm from '@/components/KeyForm'
import Lights from '@/components/Lights'
import PlugPanel from '@/components/PlugPanel'
import ShuttersPanel from '@/components/ShuttersPanel'
import {
  BACK_CLASS,
  NOTIFY_LABEL,
  BACK_LABEL,
  CHECKING_TEXT,
  FORGET_LABEL,
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
  isRead,
  onRead,
  onOpenCamera,
  tabs,
  onTab,
  onConnect,
  onForget,
}: AppUIProps) => {
  const ready = status === 'ready'
  // La caméra ouverte en détail, si elle existe encore ; sinon la mosaïque.
  const current = cameras.find((camera) => camera.name === openCamera)
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : ''
  // Sur téléphone, la vue d'une caméra est un écran à part : ni titre, ni menu, ni son, ni « Oublier la clé » (le bouton retour est dans la carte).
  if (ready && mobile && tab === 'cameras' && current) {
    return (
      <CameraCard
        // Une autre caméra (un clic sur un 📷) : l'écran est recréé, rien de la précédente ne reste (lampe, prise, zone, clip, son).
        key={current.name}
        apiKey={apiKey}
        camera={current}
        events={eventsOf(events, current.name)}
        initialEventId={openEvent}
        onRead={onRead}
        others={cameras.filter((other) => other.name !== current.name).map((other) => other.name)}
        onOpenCamera={onOpenCamera}
        onBack={() => onOpenCamera(null)}
      />
    )
  }
  // Pareil pour le plan des lumières : un écran à part, la flèche retour ramène aux caméras.
  return (
    <Page>
      <TopBar
        title={TITLE}
        onTitle={ready ? () => onTab('home') : undefined}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        info={ready ? <Weather /> : undefined}
        tabs={ready ? { label: TABS_LABEL, options: tabs, value: tab, onChange: onTab } : undefined}
        actions={
          ready ? (
            <>
              {notify === 'unsupported' ? null : (
                <Button variant={notify === 'on' ? 'active' : 'default'} disabled={notify === 'denied'} onClick={onNotify}>
                  {NOTIFY_LABEL[notify]}
                </Button>
              )}
              <Button onClick={onForget}>{FORGET_LABEL}</Button>
            </>
          ) : undefined
        }
      />

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}

      {ready ? (
        <>
          {tab === 'home' ? <Home apiKey={apiKey} /> : null}
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
                  onRead={onRead}
                  others={cameras.filter((other) => other.name !== current.name).map((other) => other.name)}
                  onOpenCamera={onOpenCamera}
                />
              </>
            ) : (
              <CameraMosaic apiKey={apiKey} cameras={cameras} events={events} isRead={isRead} onOpen={onOpenCamera} />
            )
          ) : null}
          {tab === 'lights' ? <Lights apiKey={apiKey} /> : null}
          {tab === 'shutters' ? <ShuttersPanel apiKey={apiKey} /> : null}
          {tab === 'plug' ? <PlugPanel apiKey={apiKey} /> : null}
          {tab === 'api' ? <ApiExplorer apiKey={apiKey} /> : null}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
