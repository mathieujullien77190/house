import { Button, Notice, Page, PageFrame, PageHeader, Tabs } from '@house/ui'
import ApiExplorer from '@/components/ApiExplorer'
import CameraCard from '@/components/CameraCard'
import KeyForm from '@/components/KeyForm'
import { CAMERAS_SUFFIX, CHECKING_TEXT, FORGET_LABEL, FRIGATE_EMPTY, FRIGATE_INTRO, LOCKED_TEXT, NO_CAMERA_TEXT, TABS_CLASS, TABS_LABEL, TITLE } from './constants'
import { eventsOf } from './helpers'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, apiKey, cameras, events, frigateOrigin, tab, tabs, onTab, onConnect, onForget }: AppUIProps) => {
  const ready = status === 'ready'
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
            ) : (
              cameras.map((camera) => <CameraCard key={camera.name} apiKey={apiKey} camera={camera} events={eventsOf(events, camera.name)} />)
            )
          ) : null}
          {tab === 'api' ? <ApiExplorer apiKey={apiKey} /> : null}
          {tab === 'frigate' ? <PageFrame src={frigateOrigin} title="Frigate" intro={FRIGATE_INTRO} emptyText={FRIGATE_EMPTY} /> : null}
        </>
      ) : null}
    </Page>
  )
}

export default AppUI
