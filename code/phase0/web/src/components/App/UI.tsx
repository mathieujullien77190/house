import ApiExplorer from '@/components/ApiExplorer'
import CameraCard from '@/components/CameraCard'
import KeyForm from '@/components/KeyForm'
import PageFrame from '@/components/PageFrame'
import Tabs from '@/components/Tabs'
import Button from '@/components/UI/Button'
import {
  CAMERAS_SUFFIX,
  CHECKING_TEXT,
  ERROR_CLASS,
  FORGET_LABEL,
  FRIGATE_EMPTY,
  FRIGATE_INTRO,
  HEADER_CLASS,
  LOCKED_TEXT,
  MUTED_CLASS,
  NO_CAMERA_TEXT,
  PAGE_CLASS,
  STATUS_CLASS,
  TABS_CLASS,
  TABS_LABEL,
  TITLE,
  TITLE_CLASS,
} from './constants'
import { eventsOf } from './helpers'
import type { AppUIProps } from './types'

const AppUI = ({ status, message, apiKey, cameras, events, frigateOrigin, tab, tabs, onTab, onConnect, onForget }: AppUIProps) => {
  const ready = status === 'ready'
  const statusText = status === 'checking' ? CHECKING_TEXT : status === 'locked' ? LOCKED_TEXT : `${cameras.length}${CAMERAS_SUFFIX}`
  return (
    <div className={PAGE_CLASS}>
      <header className={HEADER_CLASS}>
        <h1 className={TITLE_CLASS}>{TITLE}</h1>
        <p className={message ? ERROR_CLASS : STATUS_CLASS}>{message || statusText}</p>
        {ready ? <Button onClick={onForget}>{FORGET_LABEL}</Button> : null}
      </header>

      {!ready ? <KeyForm busy={status === 'checking'} onSubmit={onConnect} /> : null}

      {ready ? (
        <>
          <div className={TABS_CLASS}>
            <Tabs label={TABS_LABEL} options={tabs} value={tab} onChange={onTab} />
          </div>
          {tab === 'cameras' ? (
            cameras.length === 0 ? (
              <p className={MUTED_CLASS}>{NO_CAMERA_TEXT}</p>
            ) : (
              cameras.map((camera) => <CameraCard key={camera.name} apiKey={apiKey} camera={camera} events={eventsOf(events, camera.name)} />)
            )
          ) : null}
          {tab === 'api' ? <ApiExplorer apiKey={apiKey} /> : null}
          {tab === 'frigate' ? <PageFrame src={frigateOrigin} title="Frigate" intro={FRIGATE_INTRO} emptyText={FRIGATE_EMPTY} /> : null}
        </>
      ) : null}
    </div>
  )
}

export default AppUI
