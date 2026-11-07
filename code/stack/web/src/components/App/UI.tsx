import { Button, Notice, Page, TopBar } from '@house/ui'
import ApiExplorer from '@/components/ApiExplorer'
import CameraCard from '@/components/CameraCard'
import CameraMosaic from '@/components/CameraMosaic'
import Home from '@/components/Home'
import KeyForm from '@/components/KeyForm'
import Lights from '@/components/Lights'
import PlugPanel from '@/components/PlugPanel'
import { BACK_CLASS, BACK_LABEL, CAMERA_WORD, COUNTS_SEPARATOR, LAMP_WORD, CHECKING_TEXT, FORGET_LABEL, LOCKED_TEXT, NO_CAMERA_TEXT, TABS_LABEL, TITLE } from './constants'
import { countText, eventsOf } from './helpers'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, apiKey, cameras, events, lampCount, mobile, tab, openCamera, onOpenCamera, tabs, onTab, onConnect, onForget }: AppUIProps) => {
  const ready = status === 'ready'
  // La caméra ouverte en détail, si elle existe encore ; sinon la mosaïque.
  const current = cameras.find((camera) => camera.name === openCamera)
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : [countText(cameras.length, CAMERA_WORD), ...(lampCount === null ? [] : [countText(lampCount, LAMP_WORD)])].join(COUNTS_SEPARATOR)
  // Sur téléphone, la vue d'une caméra est un écran à part : ni titre, ni menu, ni son, ni « Oublier la clé » (le bouton retour est dans la carte).
  if (ready && mobile && tab === 'cameras' && current) {
    return <CameraCard apiKey={apiKey} camera={current} events={eventsOf(events, current.name)} onBack={() => onOpenCamera(null)} />
  }
  // Pareil pour le plan des lumières : un écran à part, la flèche retour ramène aux caméras.
  if (ready && mobile && tab === 'lights') {
    return <Lights apiKey={apiKey} onBack={() => onTab('cameras')} />
  }
  return (
    <Page>
      <TopBar
        title={TITLE}
        onTitle={ready ? () => onTab('home') : undefined}
        status={message || statusText}
        tone={message ? 'error' : 'muted'}
        tabs={ready ? { label: TABS_LABEL, options: tabs, value: tab, onChange: onTab } : undefined}
        actions={ready ? <Button onClick={onForget}>{FORGET_LABEL}</Button> : undefined}
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
                <CameraCard apiKey={apiKey} camera={current} events={eventsOf(events, current.name)} />
              </>
            ) : (
              <CameraMosaic apiKey={apiKey} cameras={cameras} onOpen={onOpenCamera} />
            )
          ) : null}
          {tab === 'lights' ? <Lights apiKey={apiKey} /> : null}
          {tab === 'plug' ? <PlugPanel apiKey={apiKey} /> : null}
          {tab === 'api' ? <ApiExplorer apiKey={apiKey} /> : null}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
