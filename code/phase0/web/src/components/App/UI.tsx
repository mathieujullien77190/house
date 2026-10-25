import { Button, Notice, Page, PageHeader, Tabs } from '@house/ui'
import ApiExplorer from '@/components/ApiExplorer'
import CameraCard from '@/components/CameraCard'
import CameraMosaic from '@/components/CameraMosaic'
import KeyForm from '@/components/KeyForm'
import { BACK_CLASS, BACK_LABEL, CAMERAS_SUFFIX, CHECKING_TEXT, FORGET_LABEL, LOCKED_TEXT, NO_CAMERA_TEXT, TABS_CLASS, TABS_LABEL, TITLE } from './constants'
import { eventsOf } from './helpers'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, apiKey, cameras, events, tab, openCamera, onOpenCamera, tabs, onTab, onConnect, onForget }: AppUIProps) => {
  const ready = status === 'ready'
  // La caméra ouverte en détail, si elle existe encore ; sinon la mosaïque.
  const current = cameras.find((camera) => camera.name === openCamera)
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : `${cameras.length}${CAMERAS_SUFFIX}`
  return (
    <Page>
      <PageHeader title={TITLE} status={message || statusText} tone={message ? 'error' : 'muted'} actions={ready ? <Button onClick={onForget}>{FORGET_LABEL}</Button> : null} />

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}

      {ready ? (
        <>
          <div className={TABS_CLASS}>
            <Tabs label={TABS_LABEL} options={tabs} value={tab} onChange={onTab} />
          </div>
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
          {tab === 'api' ? <ApiExplorer apiKey={apiKey} /> : null}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
